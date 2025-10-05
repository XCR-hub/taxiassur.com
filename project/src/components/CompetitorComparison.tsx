import React from 'react';
import { CheckCircle, XCircle, Crown, TrendingDown, Clock, Shield } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const CompetitorComparison: React.FC = () => {
  const features = [
    {
      feature: 'Tarifs négociés exclusifs',
      taxiassur: true,
      competitors: false,
      highlight: true
    },
    {
      feature: 'Spécialiste taxi uniquement',
      taxiassur: true,
      competitors: false,
      highlight: true
    },
    {
      feature: 'Réponse sous 15 minutes',
      taxiassur: true,
      competitors: false,
      highlight: false
    },
    {
      feature: 'Conseiller dédié taxi',
      taxiassur: true,
      competitors: false,
      highlight: false
    },
    {
      feature: 'Gestion sinistres 24h/24',
      taxiassur: true,
      competitors: true,
      highlight: false
    },
    {
      feature: 'Attestation immédiate',
      taxiassur: true,
      competitors: true,
      highlight: false
    },
    {
      feature: 'Résiliation gratuite',
      taxiassur: true,
      competitors: true,
      highlight: false
    },
    {
      feature: 'Frais de dossier',
      taxiassur: false,
      competitors: true,
      highlight: true,
      reverse: true
    }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />
      <div className="container-max">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
            🥊 TaxiAssur vs Concurrence
          </h2>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto drop-shadow-md">
            Découvrez pourquoi TaxiAssur domine le marché de l'assurance taxi
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="ai-card rounded-2xl shadow-2xl overflow-hidden border border-gray-700/60 taxi-glow">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="font-bold drop-shadow-md">Critères</div>
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="text-black drop-shadow-md" size={20} />
                  <span className="font-bold drop-shadow-md">TaxiAssur</span>
                </div>
                <div className="font-bold drop-shadow-md">Autres Courtiers</div>
              </div>
            </div>

            {/* Comparison rows */}
            <div className="divide-y divide-gray-700/50">
              {features.map((item, index) => (
                <div 
                  key={index} 
                  className={`grid grid-cols-3 gap-4 p-4 text-center items-center ${
                    item.highlight ? 'bg-amber-500/10 border-l-4 border-amber-500' : 'hover:bg-gray-800/30'
                  } transition-colors`}
                >
                  <div className="text-left">
                    <span className={`font-medium ${item.highlight ? 'text-amber-300' : 'text-gray-200'}`}>
                      {item.feature}
                    </span>
                    {item.highlight && (
                      <div className="text-xs text-amber-400 font-medium mt-1 drop-shadow-md">⭐ Avantage exclusif</div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    {item.reverse ? (
                      !item.taxiassur ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle size={20} />
                          <span className="font-bold">Gratuit</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle size={20} />
                          <span>Payant</span>
                        </div>
                      )
                    ) : (
                      item.taxiassur ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle size={20} />
                          <span className="font-bold">Inclus</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle size={20} />
                          <span>Non</span>
                        </div>
                      )
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    {item.reverse ? (
                      item.competitors ? (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle size={20} />
                          <span>50-150€</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle size={20} />
                          <span>Gratuit</span>
                        </div>
                      )
                    ) : (
                      item.competitors ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle size={20} />
                          <span>Oui</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle size={20} />
                          <span>Non</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                🎯 Résultat : TaxiAssur DOMINE la Concurrence
              </h3>
              <p className="text-gray-700 mb-4">
                Rejoignez les +1500 chauffeurs qui ont fait le bon choix
              </p>
              <a href="#devis" className="btn-primary">
                Passer à TaxiAssur Maintenant
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompetitorComparison;