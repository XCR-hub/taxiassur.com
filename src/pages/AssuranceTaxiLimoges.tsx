import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';

const AssuranceTaxiLimoges: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Limoges : Tarifs 2026 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Limoges dès 1360€/an (-35%). RC Pro incluse, assistance 24/7. Courtier spécialisé Haute-Vienne, devis gratuit en 2 min pour chauffeurs limougeauds." />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-limoges" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-limoges" hrefLang="fr" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-limoges" hrefLang="x-default" />
              <meta property="og:type" content="website" />
        <meta property="og:title" content="Assurance Taxi Limoges : Tarifs 2026 | TaxiAssur" />
        <meta property="og:description" content="Assurance Taxi Limoges dès 1360€/an (-35%). RC Pro incluse, assistance 24/7. Courtier spécialisé Haute-Vienne, devis gratuit." />
        <meta property="og:url" content="https://taxiassur.com/assurance-taxi-limoges" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Assurance Taxi Limoges : Tarifs 2026 | TaxiAssur" />
        <meta name="twitter:description" content="Assurance Taxi Limoges dès 1360€/an (-35%). RC Pro incluse." />
        <meta name="twitter:image" content="https://taxiassur.com/logo-600x300.png" />
      </Helmet>
      <JsonLd type="organization" />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-yellow-900 to-orange-900 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Limoges<br/><span className="text-yellow-400">1360€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-yellow-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <div className="text-5xl font-black text-yellow-600 mb-4">1360€/an</div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-yellow-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Limoges</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiLimoges;
