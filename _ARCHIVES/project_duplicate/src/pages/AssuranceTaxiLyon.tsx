import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, TrendingDown } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiLyon: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Lyon : Tarifs 2024 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Lyon dès 1,690€/an (-35%). Tarifs négociés pour chauffeurs lyonnais, RC Pro incluse. Devis gratuit 2 min." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-lyon" />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-orange-900 to-orange-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center bg-yellow-400 text-orange-900 px-4 py-2 rounded-full mb-6">
              <MapPin size={16} className="mr-2" />
              Spécialiste Lyon
            </div>
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Lyon<br/><span className="text-yellow-400">dès 1,690€/an</span></h1>
            <a href="#devis" className="inline-block bg-yellow-400 text-orange-900 font-bold px-8 py-4 rounded-xl">Devis Gratuit →</a>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl font-black text-center mb-12">Tarifs Lyon par Arrondissement</h2>
              <div className="bg-white shadow-xl rounded-xl p-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-yellow-600">1,690€</div>
                    <p className="text-gray-600">Lyon Centre (1-2-3)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-green-600">1,590€</div>
                    <p className="text-gray-600">Lyon Est (6-7-8)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-orange-600">1,520€</div>
                    <p className="text-gray-600">Périphérie (4-5-9)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="devis" className="py-16 bg-orange-900 text-white">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-black text-center mb-8">Devis Taxi Lyon Gratuit</h2>
            <EnhancedLeadForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AssuranceTaxiLyon;
