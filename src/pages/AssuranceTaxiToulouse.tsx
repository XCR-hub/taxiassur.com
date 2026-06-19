import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';

const AssuranceTaxiToulouse: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Toulouse : Tarifs 2026 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Toulouse dès 1,540€/an (-35%). RC Pro incluse, assistance 24/7, devis gratuit en 2 min. Courtier spécialisé chauffeurs toulousains." />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-toulouse" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-toulouse" hrefLang="fr" />
        <link rel="alternate" href="https://taxiassur.com/assurance-taxi-toulouse" hrefLang="x-default" />
              <meta property="og:type" content="website" />
        <meta property="og:title" content="Assurance Taxi Toulouse : Tarifs 2026 | TaxiAssur" />
        <meta property="og:description" content="Assurance Taxi Toulouse dès 1,540€/an. RC Pro incluse, assistance 24/7." />
        <meta property="og:url" content="https://taxiassur.com/assurance-taxi-toulouse" />
        <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="300" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="TaxiAssur" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Assurance Taxi Toulouse : Tarifs 2026 | TaxiAssur" />
        <meta name="twitter:description" content="Assurance Taxi Toulouse dès 1,540€/an. RC Pro incluse, assistance 24/7." />
        <meta name="twitter:image" content="https://taxiassur.com/logo-600x300.png" />
      </Helmet>
      <JsonLd type="organization" />
      <Header />
      <main className="min-h-screen">
        <section className="bg-gradient-to-br from-pink-900 to-pink-800 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Toulouse<br/><span className="text-yellow-400">1,540€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-pink-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-4xl font-black mb-8">Prix Toulouse</h2>
            <div className="text-5xl font-black text-pink-600 mb-4">1,540€/an</div>
            <p className="text-xl text-gray-600">RC Pro + Tous risques + Assistance 0 km</p>
          </div>
        </section>
        <section id="devis" className="py-16 bg-pink-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Toulouse</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiToulouse;
