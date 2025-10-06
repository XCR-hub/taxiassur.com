import React from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiMarseille: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Marseille : Tarifs 2024 | TaxiAssur</title>
        <meta name="description" content="Assurance Taxi Marseille dès 1,750€/an. Couverture complète pour chauffeurs marseillais, RC Pro incluse." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-marseille" />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center bg-yellow-400 text-blue-900 px-4 py-2 rounded-full mb-6">
              <MapPin size={16} className="mr-2" />
              Marseille
            </div>
            <h1 className="text-5xl font-black mb-6">Assurance Taxi Marseille<br/><span className="text-yellow-400">1,750€/an</span></h1>
            <a href="#devis" className="bg-yellow-400 text-blue-900 font-bold px-8 py-4 rounded-xl inline-block">Devis →</a>
          </div>
        </section>
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-4xl font-black text-center mb-12">Tarifs Marseille par Zone</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-black text-blue-600">1,890€</div>
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
        <section id="devis" className="py-16 bg-blue-900 text-white">
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
