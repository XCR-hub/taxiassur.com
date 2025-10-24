import React, { useState } from 'react';
import { Handshake, TrendingUp, Euro, Users, Award, CheckCircle, Phone, Mail, Calculator, FileText, Target, Zap, Gift, Star, Crown } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const PartnershipProgram: React.FC = () => {
  const [calculatorData, setCalculatorData] = useState({
    leadsPerMonth: 15,
    conversionRate: 25,
    averageCommission: 150
  });

  const monthlyEarnings = Math.round(
    (calculatorData.leadsPerMonth * calculatorData.conversionRate / 100) * calculatorData.averageCommission
  );

  const partnerTypes = [
    {
      icon: Users,
      title: 'Annuaires & Répertoires',
      description: 'Intégrez TaxiAssur dans vos annuaires taxi avec commission sur chaque lead qualifié',
      commission: '50-120€',
      examples: ['Annuaires taxi locaux', 'Répertoires professionnels', 'Pages Jaunes'],
      color: 'from-yellow-400 to-yellow-500'
    },
    {
      icon: FileText,
      title: 'Blogs & Médias Taxi',
      description: 'Monétisez votre audience avec nos articles sponsorisés et liens d\'affiliation',
      commission: '100-200€',
      examples: ['Blogs taxi', 'Magazines transport', 'Sites d\'actualités'],
      color: 'from-gray-800 to-pink-500'
    },
    {
      icon: Handshake,
      title: 'Partenaires Métier',
      description: 'Recommandez TaxiAssur à vos clients taxi et percevez une commission récurrente',
      commission: '150-300€',
      examples: ['Garages taxi', 'Équipementiers', 'Formations taxi'],
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Target,
      title: 'Apporteurs d\'Affaires',
      description: 'Devenez apporteur d\'affaires TaxiAssur avec rémunération attractive par contrat signé',
      commission: '200-500€',
      examples: ['Commerciaux indépendants', 'Consultants', 'Prescripteurs'],
      color: 'from-amber-500 to-yellow-500'
    }
  ];

  const benefits = [
    '💰 Commission attractive 50-500€ par lead qualifié',
    '📊 Suivi en temps réel de vos apports et revenus',
    '🎨 Support marketing et outils personnalisés gratuits',
    '💳 Paiement mensuel sécurisé et ponctuel',
    '🎓 Formation gratuite complète sur nos produits',
    '💻 Interface de gestion dédiée et intuitive',
    '🏆 Programme de fidélité avec bonus performance',
    '📞 Support partenaire prioritaire 7j/7'
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />
      <div className="container-max">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <Handshake className="text-black drop-shadow-md" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              Programme <span className="text-gradient">Partenaires</span>
            </h2>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Euro className="text-black drop-shadow-md" size={24} />
            </div>
          </div>
          
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            💰 Rejoignez le <strong className="text-yellow-500">programme partenaires TaxiAssur</strong> et monétisez votre audience taxi. 
            <strong className="text-green-400">Commissions attractives</strong>, outils marketing gratuits, 
            suivi temps réel. <strong className="text-yellow-400">+50 partenaires</strong> génèrent déjà des revenus avec nous.
          </p>
        </div>

        {/* Calculator */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="ai-card rounded-2xl p-8 shadow-2xl border border-gray-700/60 taxi-glow">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <Calculator className="text-yellow-500 drop-shadow-md" size={24} />
              <h3 className="text-2xl font-bold text-white drop-shadow-lg">Calculateur de Revenus Partenaire</h3>
              <Target className="text-yellow-500 animate-pulse drop-shadow-md" size={24} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Leads/mois estimés
                </label>
                <input
                  type="number"
                  value={calculatorData.leadsPerMonth}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, leadsPerMonth: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Taux conversion (%)
                </label>
                <input
                  type="number"
                  value={calculatorData.conversionRate}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, conversionRate: parseInt(e.target.value) || 0 }))}
                  min="5"
                  max="50"
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Commission moy. (€)
                </label>
                <input
                  type="number"
                  value={calculatorData.averageCommission}
                  onChange={(e) => setCalculatorData(prev => ({ ...prev, averageCommission: parseInt(e.target.value) || 0 }))}
                  min="50"
                  max="300"
                  className="w-full px-4 py-3 bg-gray-800/70 border border-gray-600 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-gray-400 transition-all duration-300"
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-8 rounded-2xl border border-green-500/40 text-center backdrop-blur-sm taxi-glow">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Gift className="text-green-400 animate-bounce drop-shadow-md" size={32} />
                <h4 className="text-2xl font-bold text-green-300 drop-shadow-lg">Revenus Mensuels Estimés</h4>
                <Star className="text-green-400 animate-pulse drop-shadow-md" size={32} />
              </div>
              <div className="text-6xl font-bold text-green-400 mb-4 drop-shadow-lg">{monthlyEarnings}€</div>
              <p className="text-lg text-green-300 drop-shadow-md">
                Soit <strong>{monthlyEarnings * 12}€/an</strong> de revenus passifs
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-2xl font-bold text-yellow-500 drop-shadow-lg">{Math.round(monthlyEarnings / 30)}</div>
                  <div className="text-gray-300 drop-shadow-md">€/jour</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">{Math.round(monthlyEarnings * 0.7)}</div>
                  <div className="text-gray-300 drop-shadow-md">€ net estimé</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">500%</div>
                  <div className="text-gray-300 drop-shadow-md">ROI moyen</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Partner Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {partnerTypes.map((type, index) => {
            const IconComponent = type.icon;
            return (
              <div key={index} className="ai-card p-8 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <IconComponent className="text-white drop-shadow-md" size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                  {type.title}
                </h3>
                
                <p className="text-gray-300 mb-4 leading-relaxed drop-shadow-md">
                  {type.description}
                </p>
                
                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 rounded-lg border border-amber-500/40 mb-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-amber-300 drop-shadow-md">Commission par lead</span>
                    <span className="text-xl font-bold text-yellow-500 drop-shadow-lg">{type.commission}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h5 className="font-medium text-white text-sm drop-shadow-md">Exemples :</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {type.examples.map((example, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="ai-card p-8 mb-16 taxi-glow">
          <h3 className="text-2xl font-bold text-white mb-8 text-center drop-shadow-lg">
            🎯 Avantages Programme Partenaires TaxiAssur
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 hover:bg-gray-700/50 transition-colors group">
                <CheckCircle className="text-green-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
                <span className="text-gray-300 font-medium text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-3xl p-12 text-black shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-yellow-600/20 to-amber-600/20 animate-pulse"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <Crown className="animate-bounce" size={40} />
                <h3 className="text-3xl font-bold">
                  🚀 Devenez Partenaire TaxiAssur Dès Aujourd'hui
                </h3>
                <Gift className="animate-pulse" size={40} />
              </div>
              
              <p className="text-xl mb-8 opacity-90">
                Rejoignez notre réseau de partenaires et générez des revenus passifs 
                en recommandant la meilleure assurance taxi du marché.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-black/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold">50-500€</div>
                  <div className="text-sm opacity-80">Commission/lead</div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold">24h</div>
                  <div className="text-sm opacity-80">Activation</div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold">500%</div>
                  <div className="text-sm opacity-80">ROI moyen</div>
                </div>
                <div className="bg-black/20 p-4 rounded-xl">
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm opacity-80">Partenaires actifs</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:partenariats@taxiassur.com?subject=Demande%20Partenariat%20TaxiAssur&body=Bonjour,%0A%0AJe%20souhaite%20devenir%20partenaire%20TaxiAssur%20:%0A%0A-%20Type%20de%20partenariat%20:%20%0A-%20Audience%20taxi%20:%20%0A-%20Trafic%20mensuel%20:%20%0A-%20Expérience%20:%20%0A%0AMerci%20de%20me%20recontacter.%0A%0ACordialement"
                  className="bg-black hover:bg-gray-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-2"
                >
                  <Mail size={20} />
                  <span>Devenir Partenaire</span>
                </a>
                <a 
                  href="tel:0180855786" 
                  className="border-2 border-black hover:bg-black hover:text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center space-x-2"
                >
                  <Phone size={20} />
                  <span>01 80 85 57 86</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnershipProgram;