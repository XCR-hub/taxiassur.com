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
    <section className="section-padding bg-gray-900">
      <div className="container-max">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            3 Étapes Simples
          </h2>
          <p className="text-gray-300 text-lg">
            De votre demande de devis à votre contrat d'assurance taxi en moins d'1 heure.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="text-center fade-in-up">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-full flex items-center justify-center text-xl font-black mx-auto mb-4 shadow-2xl subtle-pulse">
                    {index + 1}
                  </div>
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-700 mb-4 shadow-2xl border border-yellow-600/30">
                    <IconComponent className="text-yellow-400" size={28} />
                  </div>
                  <div className="inline-flex items-center space-x-2 bg-yellow-600/20 px-4 py-2 rounded-full border border-yellow-600/40">
                    <Clock size={16} className="text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-300">{step.duration}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a href="#devis" className="btn-primary inline-block cta-urgent">
            Démarrer Mon Devis Gratuit
          </a>
        </div>
      </div>
    </section>
  );
};

export default Steps;