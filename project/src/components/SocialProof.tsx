import React from 'react';
import { Star, Shield, Award, Users, TrendingUp, TrendingDown, CheckCircle, Gift, Zap, Clock } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const SocialProof: React.FC = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-gray-900 to-gray-800 border-y border-gray-700/50 relative overflow-hidden">
      <div className="container-max">
        {/* Spaced header */}
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-white mb-8">
            🏆 Pourquoi +100 Chauffeurs Nous Font Confiance
          </h3>
        </div>

        {/* Garanties TaxiAssur */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="text-green-400" size={24} />
              <h4 className="text-xl font-bold text-white">Garanties TaxiAssur</h4>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-900/50 text-green-300 px-4 py-3 rounded-lg text-center font-medium border border-green-700 flex items-center justify-center space-x-2">
              <Gift size={16} />
              <span>100% Gratuit</span>
            </div>
            <div className="bg-orange-900/50 text-orange-300 px-4 py-3 rounded-lg text-center font-medium border border-orange-700 flex items-center justify-center space-x-2">
              <Zap size={16} />
              <span>Réponse Rapide</span>
            </div>
            <div className="bg-orange-900/50 text-orange-300 px-4 py-3 rounded-lg text-center font-medium border border-orange-700 flex items-center justify-center space-x-2">
              <Award size={16} />
              <span>Service Expert</span>
            </div>
            <div className="bg-amber-900/50 text-amber-300 px-4 py-3 rounded-lg text-center font-medium border border-amber-700 flex items-center justify-center space-x-2">
              <Shield size={16} />
              <span>Courtier ORIAS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;