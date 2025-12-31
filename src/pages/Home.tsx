import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import StickyCTA from '../components/StickyCTA';
import Avantages from '../components/Avantages';
import Steps from '../components/Steps';
import FAQ from '../components/FAQ';
import Avis from '../components/Avis';
import SEOHead from '../components/SEOHead';
import SocialProof from '../components/SocialProof';
import TrustSignals from '../components/TrustSignals';
import JsonLd from '../components/JsonLd';
import PerformanceOptimizer from '../components/PerformanceOptimizer';
import Newsletter from '../components/Newsletter';
import LocalSEO from '../components/LocalSEO';
import UltimateConversion from '../components/UltimateConversion';
import TrustBadges from '../components/TrustBadges';
import InstantQuoteCalculator from '../components/InstantQuoteCalculator';
import DynamicReviews from '../components/DynamicReviews';
import SubtleConversionHelper from '../components/SubtleConversionHelper';
import InteractiveQuiz from '../components/InteractiveQuiz';
import NewsSection from '../components/NewsSection';
import { usePageTracking } from '../hooks/usePageTracking';

const Home: React.FC = () => {
  usePageTracking();

  useEffect(() => {
    localStorage.setItem('taxiassur_visited', 'true');

    const preloadLinks = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    ];

    preloadLinks.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'style';
      document.head.appendChild(link);
    });
  }, []);

  return (
    <>
      <SEOHead
        title="Assurance Taxi Pas Cher - Devis Gratuit 2 min | TaxiAssur Courtier ORIAS"
        description="🚖 ASSURANCE TAXI PAS CHER : Devis GRATUIT 2 min ✓ Économisez 35% ✓ RC Pro incluse ✓ Courtier ORIAS ✓ Réponse 15min ✓ Tarifs négociés ✓ Service expert taxi"
        keywords="assurance taxi, insurance for taxi, assurance taxi pas cher, taxi insurance cheap, courtier assurance taxi, devis assurance taxi gratuit, prix assurance taxi, taxi insurance cost, insurance for taxi drivers, rc professionnelle taxi, assurance taxi professionnel, insurance for taxi company, taxi insurance near me, how much is taxi insurance, assurance taxi france, assurance taxi paris, assurance taxi lyon, assurance taxi marseille"
        canonical="/"
      />
      <JsonLd type="organization" />
      <JsonLd type="breadcrumb" data={[
        { name: 'Accueil', url: '/' }
      ]} />
      <JsonLd type="faq" data={[
        {
          question: "Quel est le prix d'une assurance taxi ?",
          answer: "Le prix d'une assurance taxi varie entre 1200€ et 3500€ par an selon votre profil, votre véhicule et vos garanties. Avec TaxiAssur, économisez en moyenne 35% grâce à nos tarifs négociés."
        },
        {
          question: "How much is taxi insurance in France?",
          answer: "The average cost of taxi insurance in France ranges from €1,200 to €3,500 per year, depending on factors like location, driving experience, vehicle type, and coverage level. TaxiAssur offers cheap taxi insurance with up to 35% savings through our negotiated rates with 15+ insurers."
        },
        {
          question: "What insurance is required for taxi drivers?",
          answer: "Taxi drivers in France must have: 1) Third-party liability insurance (RC Pro - Responsabilité Civile Professionnelle), 2) Comprehensive vehicle insurance, 3) Passenger coverage. TaxiAssur provides all-in-one insurance packages for taxi drivers with RC Pro included."
        },
        {
          question: "Combien de temps pour recevoir mon devis ?",
          answer: "Votre devis personnalisé est généré instantanément en ligne. Notre équipe vous contacte sous 15 minutes maximum pour finaliser votre dossier."
        },
        {
          question: "La RC Pro est-elle obligatoire pour les taxis ?",
          answer: "Oui, la RC Professionnelle est obligatoire pour tous les taxis et VTC. Elle couvre les dommages causés aux tiers dans le cadre de votre activité professionnelle. Nos contrats l'incluent systématiquement."
        },
        {
          question: "Puis-je changer d'assurance taxi en cours d'année ?",
          answer: "Oui, grâce à la loi Hamon, vous pouvez résilier votre assurance taxi à tout moment après la première année. Nous gérons gratuitement toutes vos démarches de résiliation."
        }
      ]} />
      
      <PerformanceOptimizer>
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
          <Header />
          <main>
            {/* 1. Hero avec formulaire intégré - Conversion immédiate */}
            <Hero />
            
            {/* 2. Preuves sociales immédiates - Confiance */}
            <SocialProof />
            
            {/* 3. Avantages concrets - Différenciation */}
            <Avantages />
            
            {/* 4. Processus simple - Rassurance */}
            <Steps />
            
            {/* 5. FAQ essentielles - Featured snippets */}
            <FAQ />
            
            {/* 6. Calculateur devis instantané - Engagement */}
            <InstantQuoteCalculator />

            {/* 7. Avis clients dynamiques - Social proof */}
            <DynamicReviews />

            {/* 8. Quiz interactif - Lead gen ludique */}
            <section className="py-16 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-black mb-4 text-white">Testez Vos Connaissances !</h2>
                  <p className="text-xl text-gray-300 font-semibold">5 questions pour devenir expert assurance taxi</p>
                </div>
                <InteractiveQuiz />
              </div>
            </section>

            {/* 9. Avis clients classiques - Social proof */}
            <Avis />

            {/* 9.5. Actualités - News section */}
            <NewsSection limit={3} showTitle={true} />

            {/* 10. SEO local - Pages villes */}
            <LocalSEO />

            {/* 11. Signaux de confiance - Autorité */}
            <TrustSignals />

            {/* 11.5. Badges de confiance professionnels */}
            <section className="py-16 bg-white border border-yellow-100">
              <div className="container-max">
                <TrustBadges variant="compact" showLogos={false} />
                <div className="text-center mt-8">
                  <a
                    href="/confiance-certifications"
                    className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-gray-900 font-semibold font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    En savoir plus sur nos certifications
                  </a>
                </div>
              </div>
            </section>

            {/* 12. Newsletter - Engagement */}
            <Newsletter />

            {/* 13. Aide conversion subtile et intelligente */}
            <SubtleConversionHelper />
            
            {/* 10. Conversion ultime - CTA final */}
            <UltimateConversion />
          </main>
          <Footer />
          <StickyCTA />
        </div>
      </PerformanceOptimizer>
    </>
  );
};

export default Home;