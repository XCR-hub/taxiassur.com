import React from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InstantQuoteCalculator from '../components/InstantQuoteCalculator';

const DevisInstantane: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Devis Assurance Taxi Instantané Gratuit | Calculateur 2 min</title>
        <meta
          name="description"
          content="Calculez votre assurance taxi en 2 min. Devis instantané personnalisé gratuit. Comparez et économisez jusqu'à 35%. Sans engagement."
        />
        <link rel="canonical" href="https://www.taxiassur.com/devis-instantane" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        <InstantQuoteCalculator />
      </main>

      <Footer />
    </>
  );
};

export default DevisInstantane;
