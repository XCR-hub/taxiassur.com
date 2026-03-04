import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiSaintEtienne: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Saint-Etienne : Tarifs 2024 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Saint-Etienne dès 1380€/an. RC Pro incluse, assistance 24/7. Devis gratuit 2 min." />
        <link rel="canonical" href="https://taxiassur.com/assurance-taxi-saint-etienne" />
      </Helmet>
      <Header />
      <main>
        <section className="bg-gradient-to-r from-orange-900 to-orange-800 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Saint-Etienne<br/><span className="text-yellow-400">1380€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-orange-900 font-bold px-8 py-4 rounded-xl inline-block">Devis Gratuit →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black mb-8">Tarif Saint-Etienne</h2>
            <div className="text-5xl font-black text-yellow-600 mb-4">1380€/an</div>
            <p className="text-xl text-gray-600">RC Pro + Tous risques + Assistance</p>
          </div>
        </section>
        <section id="devis" className="py-16 bg-orange-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Saint-Etienne</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiSaintEtienne;
