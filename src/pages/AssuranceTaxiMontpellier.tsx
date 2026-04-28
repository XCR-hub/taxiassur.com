import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';
import CityPageSEO from '../components/CityPageSEO';

const AssuranceTaxiMontpellier: React.FC = () => {
  return (
    <>
      <CityPageSEO citySlug="montpellier" />
      <JsonLd type="organization" />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-orange-900 to-orange-800 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Montpellier<br/><span className="text-yellow-400">1560€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-orange-900 font-bold px-8 py-4 rounded-xl inline-block">Devis Gratuit →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-black mb-8">Tarif Montpellier</h2>
            <div className="text-5xl font-black text-yellow-600 mb-4">1560€/an</div>
            <p className="text-xl text-gray-600">RC Pro + Tous risques + Assistance</p>
          </div>
        </section>
        <section id="devis" className="py-16 bg-orange-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Montpellier</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiMontpellier;
