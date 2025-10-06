import React from 'react';
import { Shield, Award, Users, Clock, CheckCircle, Star, Phone, Mail } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const TrustSignals: React.FC = () => {
  const trustElements = [
    {
      icon: Shield,
      title: 'Courtier Agréé ORIAS',
      subtitle: 'N° 11 061 425',
      description: 'Certification officielle garantissant notre sérieux et notre expertise',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Award,
      title: '15 Ans d\'Expertise',
      subtitle: 'Spécialiste Taxi',
      description: 'Leader reconnu du courtage en assurance taxi en France',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Users,
      title: '+1500 Clients',
      subtitle: 'Satisfaits',
      description: 'La plus grande communauté de chauffeurs taxi assurés',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Clock,
      title: 'Réponse 15min',
      subtitle: 'Garantie',
      description: 'Engagement de rapidité unique sur le marché',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const recentActivity = [
    { action: 'Devis demandé', location: 'Paris', time: '2 min' },
    { action: 'Contrat signé', location: 'Lyon', time: '8 min' },
    { action: 'Devis demandé', location: 'Marseille', time: '12 min' },
    { action: 'Économies réalisées', location: 'Toulouse', time: '15 min' }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 relative overflow-hidden">
      <AITaxiBackground section="content" intensity="low" />
      <div className="container-max">
        {/* Trust elements */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {trustElements.map((element, index) => {
            const IconComponent = element.icon;
            return (
              <div key={index} className="ai-card p-8 text-center hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 shadow-2xl mb-4 group-hover:scale-110 transition-transform taxi-glow">
                  <IconComponent className="text-black drop-shadow-md" size={24} />
                </div>
                <h4 className="font-bold text-white mb-2 group-hover:text-amber-300 transition-colors drop-shadow-lg text-lg">{element.title}</h4>
                <p className="text-sm font-medium text-amber-400 mb-3 drop-shadow-md">{element.subtitle}</p>
                <p className="text-sm text-gray-300 drop-shadow-md leading-relaxed">{element.description}</p>
              </div>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="ai-card p-8 shadow-2xl border-2 border-amber-500/40 taxi-glow max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center drop-shadow-lg">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-3 shadow-lg"></div>
              Activité en Temps Réel
            </h3>
            <span className="text-sm text-gray-600 drop-shadow-md">🕐 Dernières 30 minutes</span>
          </div>
          
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 transition-colors backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="text-green-400" size={16} />
                  <span className="text-sm font-medium text-white drop-shadow-md">{activity.action}</span>
                  <span className="text-xs text-gray-600 drop-shadow-md">• {activity.location}</span>
                </div>
                <span className="text-xs text-amber-400 font-medium drop-shadow-md">Il y a {activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact urgency */}
        <div className="mt-8 text-center">
          <div className="ai-card p-6 max-w-3xl mx-auto bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-500/40 hover:shadow-red-500/40 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="flex items-center space-x-2">
              <Phone className="text-red-400 animate-pulse drop-shadow-md" size={24} />
              <div className="text-left">
                <div className="font-bold text-white drop-shadow-lg">Ligne Directe</div>
                <div className="text-sm text-red-300 drop-shadow-md">01 80 85 57 86</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="text-red-400 drop-shadow-md" size={24} />
              <div className="text-left">
                <div className="font-bold text-white drop-shadow-lg">Email Express</div>
                <div className="text-sm text-red-300 drop-shadow-md">team@taxiassur.com</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="text-red-400 animate-pulse drop-shadow-md" size={24} />
              <div className="text-left">
                <div className="font-bold text-white drop-shadow-lg">Rappel Garanti</div>
                <div className="text-sm text-red-300 drop-shadow-md">Sous 15 minutes</div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;