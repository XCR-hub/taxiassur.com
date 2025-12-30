import React from 'react';
import { FileText, Phone, CheckCircle, Clock } from 'lucide-react';

const Steps: React.FC = () => {
  const steps = [
    {
      icon: FileText,
      title: 'Formulaire express',
      description: 'Remplissez notre formulaire en 2 minutes : nom, contact, ville, statut.',
      duration: '2 minutes'
    },
    {
      icon: Phone,
      title: 'Rappel garanti',
      description: 'Votre expert taxi vous rappelle sous 15 minutes pour personnaliser votre offre.',
      duration: '15 minutes'
    },
    {
      icon: CheckCircle,
      title: 'Offre personnalisée',
      description: 'Recevez votre devis exclusif avec -35% et attestation immédiate.',
      duration: 'Immédiat'
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gray-900">
      <div className="container-max">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16 px-4">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
            3 Étapes Simples
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            De votre demande de devis à votre contrat d'assurance taxi en moins d'1 heure.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="text-center fade-in-up">
                <div className="relative mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-full flex items-center justify-center text-lg sm:text-xl font-black mx-auto mb-3 sm:mb-4 shadow-2xl subtle-pulse">
                    {index + 1}
                  </div>
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 mb-3 sm:mb-4 shadow-2xl border border-yellow-600/30">
                    <IconComponent className="text-yellow-400" size={24} />
                  </div>
                  <div className="inline-flex items-center space-x-2 bg-yellow-600/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-yellow-600/40">
                    <Clock size={14} className="text-yellow-400" />
                    <span className="text-xs sm:text-sm font-bold text-yellow-300">{step.duration}</span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-400 mb-4 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 sm:mt-12 px-4">
          <a href="#devis" className="btn-primary inline-block cta-urgent">
            Démarrer Mon Devis Gratuit
          </a>
        </div>
      </div>
    </section>
  );
};

export default Steps;