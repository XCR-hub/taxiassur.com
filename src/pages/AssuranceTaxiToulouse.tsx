import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';
import CityPageSEO from '../components/CityPageSEO';

const AssuranceTaxiToulouse: React.FC = () => {
  return (
    <>
      <CityPageSEO citySlug="toulouse" />
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
