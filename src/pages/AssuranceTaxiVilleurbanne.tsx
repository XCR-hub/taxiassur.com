import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiVilleurbanne: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Villeurbanne : Tarifs 2024 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Villeurbanne dès 1490€/an (-35%). RC Pro incluse." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-villeurbanne" />
      </Helmet>
      <Header />
      <main>
        <section className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Villeurbanne<br/><span className="text-yellow-400">1490€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-indigo-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <div className="text-5xl font-black text-yellow-600 mb-4">1490€/an</div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-indigo-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Villeurbanne</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiVilleurbanne;
