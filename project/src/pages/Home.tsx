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

const Home: React.FC = () => {
  useEffect(() => {
    localStorage.setItem('taxiassur_visited', 'true');
    
    // Preload critical resources for performance
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
        keywords="assurance taxi, assurance taxi pas cher, devis assurance taxi gratuit, courtier assurance taxi, RC professionnelle taxi, tarifs assurance taxi, prix assurance taxi, assurance taxi professionnel, courtier taxi spécialisé, assurance taxi paris, assurance taxi lyon, assurance taxi marseille"
        canonical="/"
      />
      <JsonLd type="organization" />
      
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
            
            {/* 6. Avis clients - Social proof */}
            <Avis />
            
            {/* 7. SEO local - Pages villes */}
            <LocalSEO />
            
            {/* 8. Signaux de confiance - Autorité */}
            <TrustSignals />
            
            {/* 9. Newsletter - Engagement */}
            <Newsletter />
            
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