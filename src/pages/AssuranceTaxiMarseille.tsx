import React from 'react';
import { MapPin } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';
import JsonLd from '../components/JsonLd';
import CityPageSEO from '../components/CityPageSEO';

const AssuranceTaxiMarseille: React.FC = () => {
  return (
    <>
      <CityPageSEO citySlug="marseille" />
      <JsonLd type="organization" />
      <Header />
      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-orange-900 to-orange-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center bg-yellow-400 text-orange-900 px-4 py-2 rounded-full mb-6">
              <MapPin size={16} className="mr-2" />
              Marseille
            </div>
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Marseille<br/><span className="text-yellow-400">1,750€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-orange-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-4xl font-black text-center mb-12">Tarifs Marseille par Zone</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-yellow-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-black text-yellow-600">1,890€</div>
                <p>Vieux-Port</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-black text-green-600">1,750€</div>
                <p>Centre-ville</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-black text-orange-600">1,620€</div>
                <p>Nord</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-black text-yellow-600">1,580€</div>
                <p>Périphérie</p>
              </div>
            </div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-orange-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Marseille</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiMarseille;
