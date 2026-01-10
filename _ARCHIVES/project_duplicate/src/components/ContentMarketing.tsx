import React from 'react';
import { FileText, TrendingUp, Users, Clock, CheckCircle, Lightbulb, Target, Award, Star, Globe } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const ContentMarketing: React.FC = () => {
  const contentPillars = [
    {
      icon: FileText,
      title: 'Guides Experts Assurance Taxi',
      description: 'Contenu approfondi 2000+ mots pour dominer les requêtes informatives',
      examples: [
        'Guide Complet Assurance Taxi 2024',
        'RC Professionnelle Taxi : Tout Savoir',
        'Optimiser son Assurance Taxi : 10 Conseils'
      ],
      seoValue: 'Longue traîne + Featured snippets',
      color: 'from-yellow-400 to-yellow-500'
    },
    {
      icon: TrendingUp,
      title: 'Actualités & Réglementation',
      description: 'Veille automatisée IA pour capturer le trafic d\'actualité',
      examples: [
        'Nouvelles Obligations Taxi 2024',
        'Évolutions Tarifaires Assurance',
        'Réglementation Transport Personnes'
      ],
      seoValue: 'Trafic frais + Autorité',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Users,
      title: 'Témoignages & Cas Clients',
      description: 'Social proof optimisé SEO avec mots-clés locaux',
      examples: [
        'Économies Réelles Clients Paris',
        'Témoignages Chauffeurs Lyon',
        'Success Stories Taxi Marseille'
      ],
      seoValue: 'Conversion + Local SEO',
      color: 'from-gray-800 to-pink-500'
    },
    {
      icon: Target,
      title: 'Comparatifs & Outils',
      description: 'Contenu utilitaire pour capturer les intentions commerciales',
      examples: [
        'Comparatif Assureurs Taxi 2024',
        'Calculateur Prime Assurance',
        'Simulateur Économies Taxi'
      ],
      seoValue: 'Intent commercial + Backlinks',
      color: 'from-amber-500 to-yellow-500'
    }
  ];

  const contentCalendar = [
    { week: 'Semaine 1', topic: 'Guide Assurance Taxi 2024', type: 'Guide Expert', words: '2500+' },
    { week: 'Semaine 2', topic: 'RC Pro Taxi : Obligations', type: 'Réglementation', words: '1800+' },
    { week: 'Semaine 3', topic: 'Économies Assurance Taxi', type: 'Conseils', words: '2000+' },
    { week: 'Semaine 4', topic: 'Comparatif Assureurs', type: 'Comparatif', words: '2200+' }
  ];

  const seoMetrics = [
    { metric: 'Articles/mois', value: '8-12', target: 'Fraîcheur contenu' },
    { metric: 'Mots/article', value: '1500-2500', target: 'Autorité topique' },
    { metric: 'Mots-clés/article', value: '15-25', target: 'Longue traîne' },
    { metric: 'Liens internes', value: '8-12', target: 'Maillage optimal' }
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />
      <div className="container-max">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <Lightbulb className="text-black drop-shadow-md" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              Content Marketing <span className="text-gradient">Stratégique</span>
            </h2>
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
              <Globe className="text-black animate-pulse drop-shadow-md" size={24} />
            </div>
          </div>
          
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            📝 <strong className="text-yellow-500">Stratégie de contenu experte</strong> pour dominer Google. 
            <strong className="text-yellow-400">8-12 articles/mois</strong> optimisés SEO, 
            <strong className="text-green-400">2000+ mots/article</strong>, ciblage longue traîne. 
            <strong className="text-yellow-400">Autorité topique maximale</strong> sur l'assurance taxi.
          </p>
        </div>

        {/* Content Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {contentPillars.map((pillar, index) => {
            const IconComponent = pillar.icon;
            return (
              <div key={index} className="ai-card rounded-2xl p-8 shadow-2xl border border-gray-700/60 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.color} mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <IconComponent className="text-white" size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                  {pillar.title}
                </h3>
                
                <p className="text-gray-300 mb-4 leading-relaxed drop-shadow-md">
                  {pillar.description}
                </p>
                
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 mb-4 backdrop-blur-sm">
                  <h5 className="font-medium text-amber-300 mb-2 text-sm drop-shadow-md">Exemples d'articles :</h5>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {pillar.examples.map((example, i) => (
                      <li key={i} className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={12} />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-3 rounded-lg border border-green-500/40 backdrop-blur-sm">
                  <span className="text-xs text-green-400 font-bold drop-shadow-md">VALEUR SEO :</span>
                  <span className="text-sm text-green-300 ml-2 drop-shadow-md">{pillar.seoValue}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Content Calendar */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            📅 Calendrier Editorial Optimisé
          </h3>
          
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-yellow-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contentCalendar.map((item, index) => (
                <div key={index} className="text-center p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">{item.week}</h4>
                  <p className="text-sm text-gray-700 mb-2">{item.topic}</p>
                  <div className="space-y-1">
                    <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                      {item.type}
                    </span>
                    <div className="text-xs text-gray-600">{item.words} mots</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Metrics */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            📊 Métriques SEO Cibles
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {seoMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div className="text-xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-sm text-gray-600 mb-2">{metric.metric}</div>
                <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  {metric.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentMarketing;