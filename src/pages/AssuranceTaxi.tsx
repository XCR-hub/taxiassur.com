import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import SEOContent from '../components/SEOContent';
import CompetitorComparison from '../components/CompetitorComparison';
import LocalSEO from '../components/LocalSEO';
import { Shield, CheckCircle, Clock, Users } from 'lucide-react';

const AssuranceTaxi: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Assurance Taxi', url: '/assurance-taxi' }
  ];

  const advantages = [
    {
      icon: Shield,
      title: 'Couverture Complète',
      description: 'RC obligatoire, dommages tous accidents, protection juridique, assistance 0km'
    },
    {
      icon: CheckCircle,
      title: 'Tarifs Négociés',
      description: 'Conditions préférentielles négociées spécialement pour les professionnels taxi'
    },
    {
      icon: Clock,
      title: 'Attestation Rapide',
      description: 'Attestation d\'assurance délivrée rapidement pour rouler en toute légalité'
    },
    {
      icon: Users,
      title: 'Accompagnement Expert',
      description: 'Conseiller dédié spécialiste taxi pour tous vos besoins'
    }
  ];

  return (
    <>
      <SEOHead
        title="Assurance Taxi Pas Cher | Devis Gratuit 2min | Comparateur | TaxiAssur"
        description="🚖 Assurance taxi professionnelle avec TaxiAssur, courtier spécialisé. Devis assurance taxi gratuit 2min ✓ Comparateur assurance taxi ✓ Assurance VTC ✓ Assurance chauffeur ✓ Assurance flotte taxi ✓ RC pro taxi ✓ Assurance taxi en ligne ✓ Économisez 35% ✓ ORIAS"
        canonical="/assurance-taxi"
        keywords="assurance taxi, assurance VTC, assurance chauffeur, assurance taxi pas cher, rc pro taxi, devis assurance taxi, comparateur assurance taxi, assurance taxi en ligne, assurance flotte taxi, courtier assurance taxi"
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
                Assurance Taxi <span className="text-gradient">Professionnelle Pas Cher</span>
              </h1>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                🛡️ <strong className="text-blue-400">Comparateur assurance taxi</strong> et <strong className="text-green-400">assurance VTC</strong>.
                <strong className="text-amber-400">Devis assurance taxi gratuit</strong> en 2min par nos
                <strong className="text-green-400">courtiers assurance taxi</strong> experts. <strong className="text-blue-400">Assurance taxi en ligne</strong> • Économisez 35% !
              </p>
              
              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                  <div className="text-2xl font-bold text-green-400 drop-shadow-lg">-35%</div>
                  <div className="text-xs text-gray-300 drop-shadow-md">Économies</div>
                </div>
                <div className="ai-card p-4 hover:shadow-amber-500/40 transition-all duration-300">
                  <div className="text-2xl font-bold text-amber-400 drop-shadow-lg">2min</div>
                  <div className="text-xs text-gray-300 drop-shadow-md">Devis</div>
                </div>
                <div className="ai-card p-4 hover:shadow-blue-500/40 transition-all duration-300">
                  <div className="text-2xl font-bold text-blue-400 drop-shadow-lg">15min</div>
                  <div className="text-xs text-gray-300 drop-shadow-md">Rappel</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="btn-primary">
                  🎯 Demander Mon Devis Assurance Taxi Gratuit
                </a>
                <a href="tel:0180855786" className="btn-outline">
                  📞 Expert Taxi : 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Advantages Section */}
        <section className="section-padding bg-gray-900">
          <div className="container-max">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Pourquoi Choisir TaxiAssur pour Votre Assurance Taxi Professionnelle ?
              </h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Une couverture assurance taxi complète et des services adaptés aux spécificités de votre métier de chauffeur
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {advantages.map((advantage, index) => {
                const IconComponent = advantage.icon;
                return (
                  <div key={index} className="card-premium text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full mb-4">
                      <IconComponent className="text-black" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {advantage.title}
                    </h3>
                    <p className="text-gray-400">
                      {advantage.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Coverage Details */}
        <section id="devis" className="section-padding bg-black">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                Détail de Votre Couverture Assurance Taxi
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card-premium">
                  <h3 className="text-xl font-bold text-gradient mb-4">Garanties Assurance Taxi Essentielles</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Responsabilité Civile obligatoire
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Dommages tous accidents
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Vol et incendie
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Bris de glaces
                    </li>
                  </ul>
                </div>

                <div className="card-premium">
                  <h3 className="text-xl font-bold text-gradient mb-4">Services Assurance Taxi Inclus</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Assistance 24h/24 - 7j/7
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Véhicule de remplacement
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Protection juridique
                    </li>
                    <li className="flex items-center text-gray-300">
                      <CheckCircle className="text-green-400 mr-3" size={16} />
                      Garantie conducteur
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contenu SEO détaillé déplacé ici */}
        <SEOContent />
        
        {/* Comparaison concurrence */}
        <CompetitorComparison />
        
        {/* SEO local */}
        <LocalSEO />

        <LeadForm />
      </main>
      <Footer />
      <StickyCTA />
    </div>
    </>
  );
};

export default AssuranceTaxi;