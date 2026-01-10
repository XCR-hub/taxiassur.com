import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiBordeaux: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Bordeaux : Tarifs 2024 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Bordeaux dès 1,590€/an. RC Pro incluse." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-bordeaux" />
      </Helmet>
      <Header />
      <main>
        <section className="bg-gradient-to-r from-red-900 to-red-800 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Bordeaux<br/><span className="text-yellow-400">1,590€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-red-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black mb-8">Prix Bordeaux</h2>
            <div className="text-5xl font-black text-red-600">1,590€/an</div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-red-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Bordeaux</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiBordeaux;
