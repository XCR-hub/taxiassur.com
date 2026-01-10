import React, { useState, useEffect } from 'react';
import { Zap, Target, TrendingUp, Users, Award, CheckCircle, Phone, Mail, Clock, Shield, Star, Gift, Crown, Sparkles } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const UltimateConversion: React.FC = () => {
  const [liveStats, setLiveStats] = useState({
    devisToday: 3,
    economiesTotal: 847000,
    clientsSatisfaits: 1500,
    taxisActifs: 50
  });

  const [urgencyTimer, setUrgencyTimer] = useState(3600); // 1 hour

  useEffect(() => {
    // Simulate live stats updates
    const statsInterval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        devisToday: prev.devisToday + (Math.random() > 0.7 ? 1 : 0),
        economiesTotal: prev.economiesTotal + Math.floor(Math.random() * 1000)
      }));
    }, 30000);

    // Urgency countdown
    const timerInterval = setInterval(() => {
      setUrgencyTimer(prev => prev > 0 ? prev - 1 : 3600);
    }, 1000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const conversionElements = [
    {
      icon: Target,
      title: 'Analyse IA Personnalisée',
      description: 'Notre IA analyse votre profil taxi en temps réel pour vous proposer la meilleure assurance du marché',
      benefit: 'Économies garanties jusqu\'à 35%',
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      icon: Zap,
      title: 'Réponse Express 15min',
      description: 'Engagement unique : votre expert taxi vous rappelle sous 15 minutes, 7j/7, même le weekend',
      benefit: 'Service le plus rapide du marché',
      color: 'from-amber-500 to-yellow-600'
    },
    {
      icon: Shield,
      title: 'Garantie Satisfaction 100%',
      description: 'Si vous trouvez moins cher ailleurs avec les mêmes garanties, nous nous alignons immédiatement',
      benefit: 'Prix imbattable garanti',
      color: 'from-green-500 to-emerald-600'
    }
  ];

  const socialProofElements = [
    { label: 'Devis demandés aujourd\'hui', value: liveStats.devisToday, icon: '📊', color: 'text-yellow-600' },
    { label: 'Économies générées (total)', value: `${Math.round(liveStats.economiesTotal / 1000)}k€`, icon: '💰', color: 'text-green-600' },
    { label: 'Prospects qualifiés', value: `${Math.floor(liveStats.clientsSatisfaits / 30)}+`, icon: '😊', color: 'text-yellow-600' },
    { label: 'Taxis clients (Sept 2025)', value: `${liveStats.taxisActifs}+`, icon: '🚖', color: 'text-amber-600' }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="high" />
      {/* Urgency background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 animate-pulse shadow-lg"></div>
        <div className="absolute bottom-0 right-0 w-full h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 animate-pulse shadow-lg" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container-max relative z-20">
        {/* Urgency Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl mb-6 taxi-glow">
            <Crown className="drop-shadow-lg" size={32} />
            <div>
              <h2 className="text-2xl font-bold">🔥 OFFRE SPÉCIALE ASSURANCE TAXI</h2>
              <p className="text-red-100 drop-shadow-md">Économisez jusqu'à 35% sur votre assurance taxi - Offre limitée</p>
            </div>
            <Gift className="drop-shadow-lg" size={32} />
          </div>
          
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            🏆 Choisissez TaxiAssur et <span className="text-gradient">Économisez</span> sur Votre Assurance Taxi
          </h3>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Rejoignez les chauffeurs taxi qui économisent avec TaxiAssur, courtier spécialisé en assurance taxi. 
            <strong className="text-red-400">Tarifs négociés exclusifs</strong> et service expert garanti.
          </p>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {socialProofElements.map((stat, index) => (
            <div key={index} className="ai-card rounded-2xl p-6 shadow-2xl text-center hover:shadow-amber-500/40 hover:scale-105 transition-all duration-300 group">
              <div className="text-3xl mb-2 group-hover:animate-bounce">{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color} mb-1 drop-shadow-lg`}>{stat.value}</div>
              <div className="text-sm text-gray-300 drop-shadow-md">{stat.label}</div>
              {index === 0 && (
                <div className="flex items-center justify-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2 shadow-lg"></div>
                  <span className="text-xs text-green-400 font-medium drop-shadow-md">Temps réel</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Conversion Elements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {conversionElements.map((element, index) => {
            const IconComponent = element.icon;
            return (
              <div key={index} className="ai-card p-8 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${element.color} mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <IconComponent className="text-white" size={32} />
                </div>
                
                <h4 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                  {element.title}
                </h4>
                
                <p className="text-gray-300 mb-4 leading-relaxed drop-shadow-md">
                  {element.description}
                </p>
                
                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-4 rounded-xl border border-amber-500/40 backdrop-blur-sm">
                  <span className="text-sm font-bold text-amber-300 drop-shadow-md">✨ {element.benefit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ultimate CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-orange-600/20 to-amber-600/20 animate-pulse"></div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                🚀 OFFRE SPÉCIALE : Économisez 35% sur Votre Assurance Taxi !
              </h3>
              
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Profitez de nos tarifs assurance taxi négociés exclusifs. 
                Rejoignez les chauffeurs taxi qui économisent déjà avec TaxiAssur !
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-6">
                <a 
                  href="#devis" 
                  className="bg-white hover:bg-yellow-50 text-red-600 font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Target size={24} />
                  <span>🎯 OBTENIR MON DEVIS ASSURANCE TAXI</span>
                </a>
                <a 
                  href="tel:0180855786" 
                  className="border-2 border-white hover:bg-white hover:text-red-600 font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <Phone size={24} />
                  <span>📞 EXPERT TAXI : 01 80 85 57 86</span>
                </a>
              </div>
              
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>Devis assurance taxi gratuit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Réponse sous 15min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} />
                  <span>Courtier ORIAS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UltimateConversion;