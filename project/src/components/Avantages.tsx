import React from 'react';
import { TrendingDown, Clock, Shield, Award } from 'lucide-react';

const Avantages: React.FC = () => {
  const advantages = [
    {
      icon: TrendingDown,
      title: 'Économies jusqu\'à -35%',
      description: 'Tarifs négociés exclusifs avec les meilleurs assureurs du marché.',
    },
    {
      icon: Clock,
      title: 'Devis express en 2 min',
      description: 'Formulaire rapide et rappel garanti sous 15 minutes.',
    },
    {
      icon: Shield,
      title: 'Couverture complète',
      description: 'RC Pro, dommages tous accidents, protection juridique, assistance 24h/24.',
    },
    {
      icon: Award,
      title: 'Courtier agréé ORIAS',
      description: 'Certification officielle et 15 ans d\'expertise dans l\'assurance taxi.',
    }
  ];

  return (
    <section className="section-padding bg-gray-950">
      <div className="container-max">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pourquoi Choisir TaxiAssur ?
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Courtier spécialisé assurance taxi avec expertise reconnue et tarifs négociés exclusifs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {advantages.map((advantage, index) => {
            const IconComponent = advantage.icon;
            return (
              <div 
                key={index}
                className="bg-gray-900/95 backdrop-blur-lg border border-gray-700/70 rounded-xl shadow-xl p-8 text-center fade-in-up hover:border-yellow-500/50 transition-colors duration-300"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-600 to-yellow-500 mb-6 shadow-2xl subtle-pulse">
                  <IconComponent className="text-black" size={28} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {advantage.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {advantage.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a href="#devis" className="btn-primary inline-block cta-urgent">
            Obtenir Mon Devis Gratuit
          </a>
        </div>
      </div>
    </section>
  );
};

export default Avantages;