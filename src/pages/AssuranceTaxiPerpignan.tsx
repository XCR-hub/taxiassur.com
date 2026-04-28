import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';
import CityPageSEO from '../components/CityPageSEO';

const AssuranceTaxiPerpignan: React.FC = () => {
  return (
    <>
      <CityPageSEO citySlug="perpignan" />
      <JsonLd type="organization" />
      <Header />
      <main>
        <section className="bg-gradient-to-r from-yellow-900 to-orange-900 text-white py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Perpignan<br/><span className="text-yellow-400">1510€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-yellow-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16 bg-white text-center">
          <div className="container mx-auto px-4">
            <div className="text-5xl font-black text-yellow-600 mb-4">1510€/an</div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-yellow-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Perpignan</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiPerpignan;
