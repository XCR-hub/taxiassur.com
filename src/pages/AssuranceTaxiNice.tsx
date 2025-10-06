import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiNice: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Nice : Tarifs Côte d'Azur 2024</title>
        <meta name="description" content="Assurance Taxi Nice dès 1,820€/an. Couverture aéroport + Côte d'Azur." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-nice" />
      </Helmet>
      <Header />
      <main>
        <section className="bg-gradient-to-r from-cyan-900 to-blue-900 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Nice<br/><span className="text-yellow-400">1,820€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-cyan-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black mb-8">Tarifs Nice + Aéroport</h2>
            <div className="text-5xl font-black text-cyan-600">1,820€/an</div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-cyan-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Nice</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiNice;
