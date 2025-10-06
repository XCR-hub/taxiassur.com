import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import LeadForm from '../components/LeadForm';
import AITaxiBackground from '../components/AITaxiBackground';
import { generateCityPages } from '../lib/ping';
import { MapPin, Phone, CheckCircle, Users, Award, TrendingDown, Shield, Clock, Star, Target, Zap, Crown, Gift } from 'lucide-react';
import Card from '../components/Card';
import StickyCTA from '../components/StickyCTA';

const CityPage: React.FC = () => {
  const { city } = useParams<{ city: string }>();
  const cities = generateCityPages();
  const cityData = cities.find(c => c.slug === city);

  if (!cityData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        <main className="section-padding">
          <div className="container-max text-center">
            <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Ville non trouvée
            </h1>
            <p className="text-gray-300">
              La page que vous recherchez n'existe pas.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Villes', url: '/villes' },
    { name: `Assurance Taxi ${cityData.city}`, url: `/ville/${cityData.slug}` }
  ];

  const localBenefits = [
    {
      icon: MapPin,
      title: `🗺️ Expertise Locale ${cityData.city}`,
      description: `Connaissance approfondie du marché taxi de ${cityData.city} et de sa région. Tarifs adaptés aux spécificités locales.`,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: TrendingDown,
      title: '💰 Tarifs Négociés Exclusifs',
      description: `Conditions préférentielles spécialement négociées pour le marché taxi de ${cityData.city}. Économisez jusqu'à 35%.`,
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Users,
      title: '🤝 Réseau Partenaires Local',
      description: `Partenaires privilégiés dans la région de ${cityData.city} : garages, équipementiers, services.`,
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: Award,
      title: '🏆 Service Premium Dédié',
      description: `Accompagnement personnalisé et réactif par nos experts spécialisés taxi ${cityData.city}.`,
      color: 'from-amber-500 to-yellow-600'
    }
  ];

  const localFeatures = [
    'Connaissance des spécificités réglementaires locales',
    'Tarifs adaptés au marché régional et à la concurrence',
    'Réseau de partenaires privilégiés (garages, équipementiers)',
    'Assistance rapide et intervention locale en cas de sinistre',
    'Conseiller dédié expert du marché taxi de votre région',
    'Démarches administratives simplifiées et accélérées'
  ];

  const cityStats = {
    taxis: cityData.city === 'Paris' ? '18000+' : 
           cityData.city === 'Lyon' ? '2500+' : 
           cityData.city === 'Marseille' ? '3200+' : 
           cityData.city === 'Toulouse' ? '1800+' :
           cityData.city === 'Nice' ? '800+' :
           cityData.city === 'Bordeaux' ? '1200+' : '600+',
    clients: Math.min(Math.floor(Math.random() * 15) + 8, 25),
    savings: '35%',
    avgSaving: cityData.city === 'Paris' ? '720€' : 
               cityData.city === 'Lyon' ? '580€' : 
               cityData.city === 'Marseille' ? '540€' : 
               cityData.city === 'Toulouse' ? '590€' :
               cityData.city === 'Nice' ? '610€' :
               cityData.city === 'Bordeaux' ? '560€' : '520€'
  };

  const localTestimonials = [
    {
      name: `Chauffeur taxi ${cityData.city}`,
      comment: `Excellent service à ${cityData.city} ! L'équipe TaxiAssur connaît parfaitement notre marché local et m'a trouvé une assurance parfaitement adaptée. Économie de ${cityStats.avgSaving}/an !`,
      rating: 5,
      city: cityData.city,
      savings: cityStats.avgSaving
    }
  ];

  return (
    <>
      <Seo
        title={cityData.title}
        description={cityData.description}
        canonical={`/ville/${cityData.slug}`}
        keywords={`assurance taxi ${cityData.city}, RC pro ${cityData.city}, devis taxi ${cityData.city}, courtier taxi ${cityData.city}, assurance taxi pas cher ${cityData.city}`}
        city={cityData.city}
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        
        <main>
          {/* Hero Section - Enhanced with AI Background */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="high" />
            
            {/* Enhanced Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage: `url('https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-gray-900/70 to-black/90"></div>
            </div>
            
            <div className="container-max relative z-20">
              <div className="max-w-5xl mx-auto text-center">
                {/* Enhanced City Badge */}
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                    <MapPin className="text-black drop-shadow-md" size={24} />
                  </div>
                  <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 px-6 py-3 rounded-2xl border border-amber-500/40 backdrop-blur-sm">
                    <span className="text-amber-300 font-bold text-lg drop-shadow-lg">{cityData.city} ({cityData.department})</span>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                    <Target className="text-black animate-pulse drop-shadow-md" size={24} />
                  </div>
                </div>
                
                <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                  Assurance Taxi <span className="text-gradient">{cityData.city}</span>
                </h1>
                
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  🚖 <strong className="text-blue-400">Trouvez la meilleure assurance taxi à {cityData.city}</strong> avec TaxiAssur. 
                  <strong className="text-amber-400">Devis gratuit personnalisé</strong>, 
                  <strong className="text-green-400">tarifs négociés exclusifs</strong> et 
                  <strong className="text-purple-400">service professionnel local</strong>.
                </p>
                
                {/* Enhanced Stats locales */}
                <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mb-8">
                  <div className="ai-card p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-amber-400 mb-2 drop-shadow-lg group-hover:scale-110 transition-transform">{cityStats.taxis}</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Taxis actifs</div>
                    <div className="text-xs text-amber-400 drop-shadow-md">Marché local</div>
                  </div>
                  <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-green-400 mb-2 drop-shadow-lg group-hover:scale-110 transition-transform">{cityStats.clients}+</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Clients TaxiAssur</div>
                    <div className="text-xs text-green-400 drop-shadow-md">Depuis Sept 2025</div>
                  </div>
                  <div className="ai-card p-6 hover:shadow-blue-500/40 transition-all duration-300 group">
                    <div className="text-3xl font-bold text-blue-400 mb-2 drop-shadow-lg group-hover:scale-110 transition-transform">-{cityStats.savings}</div>
                    <div className="text-sm text-gray-300 drop-shadow-md">Économie moy.</div>
                    <div className="text-xs text-blue-400 drop-shadow-md">{cityStats.avgSaving}/an</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#devis" className="btn-primary">
                    🎯 Devis Assurance Taxi {cityData.city} Gratuit
                  </a>
                  <a href="tel:0180855786" className="btn-outline">
                    📞 Expert {cityData.city} : 01 80 85 57 86
                  </a>
                </div>
                
                <p className="text-sm text-gray-300 mt-6 drop-shadow-md">
                  ⚡ Réponse sous 15min • 🏆 Courtier ORIAS • 💰 Tarifs {cityData.city} négociés
                </p>
              </div>
            </div>
          </section>

          {/* Enhanced Local Benefits */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />
            <div className="container-max">
              <div className="text-center mb-16">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <Crown className="text-amber-400 animate-bounce drop-shadow-lg" size={32} />
                  <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                    Pourquoi Choisir TaxiAssur à <span className="text-gradient">{cityData.city}</span> ?
                  </h2>
                  <Gift className="text-amber-400 animate-pulse drop-shadow-lg" size={32} />
                </div>
                <p className="text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-md">
                  🎯 <strong className="text-amber-400">Expertise locale reconnue</strong> et 
                  <strong className="text-green-400">solutions sur-mesure</strong> adaptées aux spécificités 
                  du marché taxi de <strong className="text-blue-400">{cityData.city}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {localBenefits.map((benefit, index) => {
                  const IconComponent = benefit.icon;
                  return (
                    <div key={index} className="ai-card p-8 text-center hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${benefit.color} mb-6 shadow-2xl group-hover:scale-110 transition-transform taxi-glow`}>
                        <IconComponent className="text-white drop-shadow-md" size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed drop-shadow-md">
                        {benefit.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Enhanced CTA Section */}
              <div className="text-center">
                <div className="ai-card p-8 max-w-3xl mx-auto taxi-glow">
                  <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                    🚀 Rejoignez les Chauffeurs Taxi de {cityData.city} qui Économisent avec TaxiAssur
                  </h3>
                  <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                    Découvrez pourquoi nos clients de {cityData.city} nous recommandent et 
                    obtenez votre devis personnalisé dès maintenant.
                  </p>
                  <a href="#devis" className="btn-primary">
                    🎯 OBTENIR MON DEVIS TAXI {cityData.city.toUpperCase()} GRATUIT
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced Spécificités locales */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="low" />
            <div className="container-max">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                    🎯 Spécificités Assurance Taxi <span className="text-gradient">{cityData.city}</span>
                  </h2>
                  <p className="text-xl text-gray-200 max-w-3xl mx-auto drop-shadow-md">
                    Des services pensés spécialement pour les professionnels du taxi de {cityData.city} et sa région.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="ai-card p-8 hover:shadow-green-500/40 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">
                      🛡️ Services Inclus à {cityData.city}
                    </h3>
                    <div className="space-y-4">
                      {localFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={20} />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6 rounded-xl border border-green-500/40 backdrop-blur-sm">
                      <h4 className="text-lg font-bold text-green-300 mb-4 drop-shadow-lg">
                        🎯 Avantages Exclusifs {cityData.city}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Shield className="text-blue-400" size={16} />
                          <span className="text-gray-300">RC Pro adaptée</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="text-orange-400" size={16} />
                          <span className="text-gray-300">Réponse 24h</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="text-purple-400" size={16} />
                          <span className="text-gray-300">Réseau local</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Award className="text-green-400" size={16} />
                          <span className="text-gray-300">Expert dédié</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Enhanced Contact Card */}
                    <div className="ai-card p-8 hover:shadow-amber-500/40 transition-all duration-300">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Phone className="text-black drop-shadow-md" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                          Contact Expert {cityData.city}
                        </h3>
                      </div>
                      <p className="text-gray-300 mb-6 drop-shadow-md">
                        Notre équipe connaît parfaitement le marché taxi de {cityData.city} 
                        et vous accompagne dans toutes vos démarches d'assurance.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                          <Phone className="text-amber-400" size={20} />
                          <div>
                            <p className="font-bold text-white text-lg">01 80 85 57 86</p>
                            <p className="text-sm text-gray-600">Ligne directe expert {cityData.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                          <MapPin className="text-amber-400" size={20} />
                          <div>
                            <p className="font-bold text-white">Service {cityData.city}</p>
                            <p className="text-sm text-gray-600">Expertise locale garantie • Réponse 15min</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Stats Card */}
                    <div className="ai-card p-8 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/40 hover:shadow-blue-500/40 transition-all duration-300">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Users className="text-white drop-shadow-md" size={24} />
                        </div>
                        <h4 className="text-xl font-bold text-white drop-shadow-lg">
                          📊 Marché Taxi {cityData.city}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-400 mb-2 drop-shadow-lg">{cityStats.taxis}</div>
                          <div className="text-sm text-gray-300 drop-shadow-md">Taxis en activité</div>
                          <div className="text-xs text-blue-400 drop-shadow-md">Marché dynamique</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400 mb-2 drop-shadow-lg">{cityStats.clients}+</div>
                          <div className="text-sm text-gray-300 drop-shadow-md">Nos clients locaux</div>
                          <div className="text-xs text-green-400 drop-shadow-md">Depuis Sept 2025</div>
                        </div>
                      </div>
                      <div className="mt-6 text-center">
                        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/40">
                          <p className="text-green-300 font-bold drop-shadow-md">
                            💰 Économie moyenne à {cityData.city} : {cityStats.avgSaving}/an
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced Témoignage local */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="low" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                    🗣️ Témoignages Clients Taxi <span className="text-gradient">{cityData.city}</span>
                  </h2>
                  <p className="text-xl text-gray-200 drop-shadow-md">
                    Découvrez l'expérience de nos clients taxi de {cityData.city}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  {localTestimonials.map((testimonial, index) => (
                    <div key={index} className="ai-card p-8 hover:shadow-amber-500/40 transition-all duration-300 group">
                      <div className="flex justify-center mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current group-hover:scale-110 transition-transform" size={24} />
                        ))}
                      </div>
                      <blockquote className="text-lg text-gray-200 mb-6 italic text-center leading-relaxed drop-shadow-md">
                        "{testimonial.comment}"
                      </blockquote>
                      <div className="text-center">
                        <p className="font-bold text-white text-lg drop-shadow-lg">{testimonial.name}</p>
                        <p className="text-amber-400 font-medium drop-shadow-md">📍 {testimonial.city}</p>
                        <div className="mt-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 rounded-full border border-green-500/40 inline-block">
                          <span className="text-green-300 font-bold text-sm drop-shadow-md">
                            💰 Économie : {testimonial.savings}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="ai-card p-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/40 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Star className="text-white drop-shadow-md" size={32} />
                      </div>
                      <div className="text-4xl font-bold text-green-400 mb-2 drop-shadow-lg">4.9/5</div>
                      <div className="flex justify-center mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="text-yellow-400 fill-current" size={20} />
                        ))}
                      </div>
                      <p className="text-lg font-bold text-white mb-2 drop-shadow-lg">Note moyenne à {cityData.city}</p>
                      <p className="text-sm text-gray-300 mb-4 drop-shadow-md">Basé sur {cityStats.clients}+ clients locaux</p>
                      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-3 rounded-lg border border-amber-500/40">
                        <p className="text-amber-300 font-medium text-sm drop-shadow-md">
                          🏆 TaxiAssur = Référence taxi {cityData.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced FAQ locale */}
          <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
            <AITaxiBackground section="content" intensity="medium" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                  <div className="flex items-center justify-center space-x-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                      <Zap className="text-black drop-shadow-md" size={24} />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                      FAQ Assurance Taxi <span className="text-gradient">{cityData.city}</span>
                    </h2>
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                      <Target className="text-black animate-pulse drop-shadow-md" size={24} />
                    </div>
                  </div>
                  <p className="text-xl text-gray-200 drop-shadow-md">
                    Réponses expertes aux questions spécifiques des chauffeurs taxi de {cityData.city}
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div className="ai-card p-8 hover:shadow-blue-500/40 transition-all duration-300">
                    <h3 className="font-bold text-white mb-4 text-xl drop-shadow-lg">
                      💰 Quel est le tarif moyen d'une assurance taxi à {cityData.city} ?
                    </h3>
                    <p className="text-gray-300 leading-relaxed drop-shadow-md">
                      À <strong className="text-amber-400">{cityData.city}</strong>, nos clients économisent en moyenne 
                      <strong className="text-green-400"> 35% sur leur assurance taxi</strong>. Les tarifs varient selon la zone d'activité 
                      (centre-ville, périphérie, aéroport), l'expérience du conducteur et le type de véhicule. 
                      Avec TaxiAssur, <strong className="text-blue-400">économie moyenne constatée : {cityStats.avgSaving}/an</strong>. 
                      Demandez votre <strong className="text-purple-400">devis personnalisé gratuit</strong> pour connaître votre tarif exact.
                    </p>
                  </div>
                  
                  <div className="ai-card p-8 hover:shadow-green-500/40 transition-all duration-300">
                    <h3 className="font-bold text-white mb-4 text-xl drop-shadow-lg">
                      🎯 Quelles sont les spécificités de l'assurance taxi à {cityData.city} ?
                    </h3>
                    <p className="text-gray-300 leading-relaxed drop-shadow-md">
                      Le marché taxi de <strong className="text-amber-400">{cityData.city}</strong> présente des particularités que nous connaissons parfaitement : 
                      densité de circulation, zones d'activité privilégiées (gares, aéroports, centres commerciaux), 
                      réglementation locale spécifique. Notre <strong className="text-green-400">expertise locale</strong> nous permet de vous proposer 
                      les <strong className="text-blue-400">meilleures conditions adaptées à {cityData.city}</strong> et sa région.
                    </p>
                  </div>
                  
                  <div className="ai-card p-8 hover:shadow-purple-500/40 transition-all duration-300">
                    <h3 className="font-bold text-white mb-4 text-xl drop-shadow-lg">
                      ⚡ Combien de temps pour obtenir mon attestation à {cityData.city} ?
                    </h3>
                    <p className="text-gray-300 leading-relaxed drop-shadow-md">
                      Pour les chauffeurs taxi de <strong className="text-amber-400">{cityData.city}</strong>, nous délivrons 
                      <strong className="text-green-400"> l'attestation d'assurance sous 2h ouvrées</strong> par email. 
                      En cas d'urgence (contrôle, mise en service immédiate), 
                      <strong className="text-red-400">transmission immédiate possible</strong> pour que vous puissiez 
                      reprendre votre activité taxi à {cityData.city} sans délai.
                    </p>
                  </div>

                  <div className="ai-card p-8 hover:shadow-amber-500/40 transition-all duration-300">
                    <h3 className="font-bold text-white mb-4 text-xl drop-shadow-lg">
                      🤝 TaxiAssur a-t-il des partenaires à {cityData.city} ?
                    </h3>
                    <p className="text-gray-300 leading-relaxed drop-shadow-md">
                      Oui ! Nous avons développé un <strong className="text-blue-400">réseau de partenaires privilégiés à {cityData.city}</strong> : 
                      garages spécialisés taxi, équipementiers (compteurs, GPS), centres de contrôle technique. 
                      Ces partenariats vous garantissent des <strong className="text-green-400">tarifs préférentiels</strong> et un 
                      <strong className="text-amber-400">service prioritaire</strong> en cas de besoin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Enhanced CTA Final */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
            <AITaxiBackground section="content" intensity="high" />
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <div className="ai-card p-12 taxi-glow">
                  <div className="flex items-center justify-center space-x-3 mb-6">
                    <Crown className="text-amber-400 animate-bounce drop-shadow-lg" size={40} />
                    <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                      Prêt à Économiser sur Votre Assurance Taxi à {cityData.city} ?
                    </h2>
                    <Gift className="text-amber-400 animate-pulse drop-shadow-lg" size={40} />
                  </div>
                  
                  <p className="text-xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                    🚀 Rejoignez les <strong className="text-green-400">{cityStats.clients}+ chauffeurs taxi de {cityData.city}</strong> 
                    qui économisent déjà avec TaxiAssur. <strong className="text-amber-400">Devis gratuit personnalisé</strong> 
                    et <strong className="text-blue-400">expertise locale garantie</strong>.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/40">
                      <div className="text-2xl font-bold text-green-400 drop-shadow-lg">{cityStats.avgSaving}</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Économie moyenne</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 p-4 rounded-xl border border-blue-500/40">
                      <div className="text-2xl font-bold text-blue-400 drop-shadow-lg">15min</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Rappel garanti</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/40">
                      <div className="text-2xl font-bold text-purple-400 drop-shadow-lg">Local</div>
                      <div className="text-sm text-gray-300 drop-shadow-md">Expert {cityData.city}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="#devis" className="btn-primary">
                      🎯 OBTENIR MON DEVIS TAXI {cityData.city.toUpperCase()} GRATUIT
                    </a>
                    <a href="tel:0180855786" className="btn-outline">
                      📞 EXPERT {cityData.city.toUpperCase()} : 01 80 85 57 86
                    </a>
                  </div>
                  
                  <p className="text-sm text-gray-300 mt-6 drop-shadow-md">
                    🏆 Courtier ORIAS spécialisé taxi • ⚡ Service {cityData.city} • 💎 Tarifs négociés exclusifs
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Lead Form */}
          <LeadForm />
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default CityPage;