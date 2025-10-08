import React from 'react';
import { Shield, TrendingDown, Clock, Users, Award, CheckCircle, Star, Phone, Mail } from 'lucide-react';
import AITaxiBackground from './AITaxiBackground';

const SEOContent: React.FC = () => {
  return (
    <section className="section-padding bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
      <AITaxiBackground section="content" intensity="medium" />
      <div className="container-max">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced SEO Header */}
          <div className="text-center mb-12 sm:mb-16 px-4">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                <Shield className="text-black drop-shadow-md" size={20} />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg leading-tight">
                Assurance Taxi <span className="text-gradient">Pro</span>
              </h2>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-2xl taxi-glow">
                <Award className="text-black animate-pulse drop-shadow-md" size={20} />
              </div>
            </div>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
              🎯 <strong className="text-amber-400">Guide complet 2025</strong> pour choisir la meilleure 
              <strong className="text-blue-400">assurance taxi professionnelle</strong>. 
              <strong className="text-green-400">Conseils d'experts</strong> et comparatifs détaillés.
            </p>
          </div>

          {/* Main SEO content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12 mb-12 sm:mb-16 px-4">
            {/* Primary content */}
            <div className="lg:col-span-2 space-y-8">
              <div className="ai-card p-4 sm:p-6 md:p-8 hover:shadow-amber-500/40 transition-all duration-300">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg leading-tight">
                  Guide Complet 2025
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed mb-4 sm:mb-6 drop-shadow-md">
                  L'<strong className="text-amber-400">assurance taxi</strong> est obligatoire pour exercer votre activité de chauffeur de taxi en France. 
                  En tant que <strong className="text-blue-400">courtier assurance taxi</strong> spécialisé depuis 15 ans, TaxiAssur vous accompagne 
                  pour trouver la meilleure <strong className="text-green-400">assurance taxi pas cher</strong> adaptée à vos besoins professionnels.
                </p>
                
                <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
                  Pourquoi un Courtier ?
                </h4>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-4 sm:mb-6 drop-shadow-md">
                  Un <strong className="text-amber-400">courtier assurance taxi</strong> comme TaxiAssur négocie pour vous les meilleures conditions 
                  auprès de multiples assureurs. Notre expertise du secteur taxi nous permet d'obtenir des 
                  <strong className="text-green-400">tarifs assurance taxi</strong> jusqu'à 35% moins chers que les assureurs traditionnels.
                </p>

                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-6 rounded-xl border border-amber-500/40 mb-8 backdrop-blur-sm">
                  <h5 className="font-bold text-amber-300 mb-3 drop-shadow-md">💡 Conseil Expert TaxiAssur</h5>
                  <p className="text-amber-200 text-sm leading-relaxed drop-shadow-md">
                    La <strong>RC professionnelle taxi</strong> est distincte de l'assurance véhicule. Elle couvre 
                    votre responsabilité en tant que professionnel du transport de personnes. Chez TaxiAssur, 
                    nous incluons systématiquement cette garantie essentielle dans nos <strong>devis assurance taxi</strong>.
                  </p>
                </div>

                <h4 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
                  Garanties Essentielles Assurance Taxi
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                    <h5 className="font-bold text-white mb-3 flex items-center drop-shadow-lg">
                      <Shield className="text-blue-400 mr-2" size={20} />
                      RC Professionnelle Taxi
                    </h5>
                    <ul className="text-sm text-gray-300 space-y-2 drop-shadow-md">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Responsabilité civile obligatoire</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Dommages causés aux passagers</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Protection juridique incluse</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Montants jusqu'à 10M€</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                    <h5 className="font-bold text-white mb-3 flex items-center drop-shadow-lg">
                      <Users className="text-green-400 mr-2" size={20} />
                      Assurance Véhicule Taxi
                    </h5>
                    <ul className="text-sm text-gray-300 space-y-2 drop-shadow-md">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Dommages tous accidents</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Vol et incendie</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Bris de glaces</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="text-green-400" size={14} />
                        <span>Assistance 24h/24</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <h4 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
                  Tarifs Assurance Taxi : Économisez avec TaxiAssur
                </h4>
                <p className="text-gray-300 leading-relaxed mb-6 drop-shadow-md">
                  Les <strong className="text-amber-400">tarifs assurance taxi</strong> varient selon votre zone d'activité, votre expérience 
                  et votre véhicule. Grâce à nos partenariats avec les meilleurs assureurs, TaxiAssur obtient 
                  des <strong className="text-green-400">prix assurance taxi</strong> préférentiels. Nos clients économisent en moyenne 580€ par an.
                </p>

                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6 rounded-xl border border-green-500/40 mb-8 backdrop-blur-sm taxi-glow">
                  <h5 className="font-bold text-green-300 mb-3 drop-shadow-md">💰 Exemple d'Économies Réelles</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-200 drop-shadow-md"><strong>Assureur traditionnel :</strong></p>
                      <p className="text-green-100 font-bold">2400€/an (taxi Paris)</p>
                    </div>
                    <div>
                      <p className="text-green-200 drop-shadow-md"><strong>Tarif TaxiAssur :</strong></p>
                      <p className="text-green-100 font-bold">1560€/an (-35%)</p>
                    </div>
                  </div>
                  <p className="text-green-200 mt-3 font-medium drop-shadow-md">
                    Économie annuelle : <strong className="text-green-100">840€</strong> • Même couverture, meilleur prix !
                  </p>
                </div>

                <h4 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
                  Devis Assurance Taxi Gratuit en 2 Minutes
                </h4>
                <p className="text-gray-300 leading-relaxed mb-6 drop-shadow-md">
                  Obtenez votre <strong className="text-amber-400">devis assurance taxi</strong> gratuit personnalisé en moins de 2 minutes.
                  Notre <strong className="text-blue-400">comparateur assurance taxi</strong> optimisé vous permet de comparer instantanément les meilleures offres
                  du marché. Réponse garantie sous 15 minutes par nos experts en <strong className="text-green-400">assurance chauffeur</strong>.
                </p>

                <h4 className="text-xl font-bold text-white mb-4 mt-8 drop-shadow-lg">
                  Comparateur Assurance Taxi : Trouvez la Meilleure Offre
                </h4>
                <p className="text-gray-300 leading-relaxed mb-6 drop-shadow-md">
                  Notre <strong className="text-amber-400">comparateur assurance taxi</strong> analyse en temps réel les offres de 15+ assureurs partenaires.
                  Contrairement aux comparateurs généralistes, TaxiAssur est spécialisé exclusivement dans
                  l'<strong className="text-blue-400">assurance VTC</strong> et l'<strong className="text-green-400">assurance chauffeur</strong>.
                  Cette expertise nous permet d'obtenir des tarifs jusqu\'à 40% moins chers pour une
                  <strong className="text-amber-400">assurance flotte taxi</strong> ou un véhicule unique.
                </p>

                <h4 className="text-xl font-bold text-white mb-4 mt-8 drop-shadow-lg">
                  Assurance Taxi en Ligne : Rapide et Sécurisé
                </h4>
                <p className="text-gray-300 leading-relaxed mb-6 drop-shadow-md">
                  Souscrire une <strong className="text-amber-400">assurance taxi en ligne</strong> avec TaxiAssur est simple et 100% sécurisé.
                  Notre processus digital vous permet d'obtenir votre attestation d\'assurance en quelques clics, sans rendez-vous physique.
                  Nos <strong className="text-blue-400">courtiers assurance taxi</strong> restent disponibles 7j/7 pour vous accompagner à chaque étape.
                </p>

                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-xl border border-purple-500/40 mb-8 backdrop-blur-sm">
                  <h5 className="font-bold text-purple-300 mb-3 drop-shadow-md">🌟 Assurance Flotte Taxi : Offre Spéciale</h5>
                  <p className="text-purple-200 text-sm leading-relaxed drop-shadow-md mb-3">
                    Vous gérez plusieurs véhicules ? Notre <strong>assurance flotte taxi</strong> vous fait économiser jusqu'à
                    45% par rapport à des contrats individuels. Avantages exclusifs pour flottes de 3+ véhicules :
                  </p>
                  <ul className="text-purple-200 text-sm space-y-2">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-300" size={14} />
                      <span>Gestion centralisée de tous vos véhicules</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-300" size={14} />
                      <span>Tarifs dégressifs selon nombre de taxis</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-300" size={14} />
                      <span>Véhicules de remplacement prioritaires</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="text-purple-300" size={14} />
                      <span>Conseiller dédié disponible 24/7</span>
                    </li>
                  </ul>
                </div>

                <h4 className="text-xl font-bold text-white mb-4 mt-8 drop-shadow-lg">
                  Assurance VTC et Assurance Chauffeur : Notre Expertise
                </h4>
                <p className="text-gray-300 leading-relaxed mb-6 drop-shadow-md">
                  Au-delà de l'<strong className="text-amber-400">assurance taxi</strong>, TaxiAssur est également spécialiste de
                  l'<strong className="text-blue-400">assurance VTC</strong> et de toutes formes d'<strong className="text-green-400">assurance chauffeur</strong> professionnel.
                  Que vous soyez chauffeur de taxi traditionnel, conducteur VTC, ou exploitant d'une flotte mixte,
                  nos solutions s'adaptent parfaitement à votre activité. Notre statut de <strong className="text-amber-400">courtier assurance taxi</strong>
                  certifié ORIAS nous permet de négocier les meilleures conditions pour tous types de transport de personnes.
                </p>

                {/* CTA intégré dans le contenu SEO */}
                <div className="mt-8 text-center">
                  <a 
                    href="#devis" 
                    className="inline-block bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-xl hover:shadow-amber-500/40 transform hover:scale-105"
                  >
                    🎯 DEMANDER MON DEVIS ASSURANCE TAXI GRATUIT
                  </a>
                  <p className="text-sm text-gray-600 mt-3 drop-shadow-md">
                    ⚡ Réponse sous 15min • 🏆 Courtier ORIAS • 💰 Économisez 35%
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 p-6 rounded-xl border border-blue-500/40 backdrop-blur-sm">
                  <h5 className="font-bold text-blue-300 mb-3 drop-shadow-md">🚀 Processus TaxiAssur</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold shadow-lg">1</div>
                      <p className="text-blue-200 font-medium drop-shadow-md">Devis en ligne</p>
                      <p className="text-blue-100">2 minutes</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold shadow-lg">2</div>
                      <p className="text-blue-200 font-medium drop-shadow-md">Analyse expert</p>
                      <p className="text-blue-100">15 minutes</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold shadow-lg">3</div>
                      <p className="text-blue-200 font-medium drop-shadow-md">Offre personnalisée</p>
                      <p className="text-blue-100">Immédiat</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick facts & CTA */}
            <div className="space-y-6">
              <div className="ai-card p-6 hover:shadow-amber-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-4 drop-shadow-lg">📊 TaxiAssur en Chiffres</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Clients satisfaits</span>
                    <span className="font-bold text-amber-400">+1500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Spécialiste taxi depuis</span>
                    <span className="font-bold text-amber-400">septembre 2025</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Économie moyenne</span>
                    <span className="font-bold text-green-400">-35%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Objectif qualité</span>
                    <span className="font-bold text-amber-400">Excellence</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Délai de réponse</span>
                    <span className="font-bold text-blue-400">15 min</span>
                  </div>
                </div>
              </div>

              <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-4 drop-shadow-lg">🏆 Pourquoi TaxiAssur ?</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-400" size={16} />
                    <span>Courtier agréé ORIAS 11 061 425</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-400" size={16} />
                    <span>Spécialiste taxi depuis septembre 2025</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-400" size={16} />
                    <span>Tarifs négociés exclusifs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="text-green-400" size={16} />
                    <span>Service client 7j/7</span>
                  </li>
                </ul>
              </div>

              <div className="ai-card p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/40 hover:shadow-blue-500/40 transition-all duration-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-300">Clients taxi</span>
                  <span className="font-bold text-amber-400">100+</span>
                </div>
                <a 
                  href="#devis" 
                  className="block w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-xl hover:shadow-amber-500/40 transform hover:scale-105 mb-4"
                >
                  🎯 DEMANDER MON DEVIS GRATUIT
                </a>
                
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Phone size={14} />
                    <span>01 80 85 57 86</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail size={14} />
                    <span>team@taxiassur.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional SEO content */}
          <div className="mt-16 space-y-8">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-white mb-8 drop-shadow-lg">
                Assurance Taxi par Ville : Couverture Nationale
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes',
                'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims'
              ].map(city => (
                <a
                  key={city}
                  href={`/ville/${city.toLowerCase()}`}
                  className="ai-card text-center p-4 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group"
                >
                  <div className="font-medium text-white group-hover:text-amber-300 transition-colors drop-shadow-lg">{city}</div>
                  <div className="text-xs text-gray-600 group-hover:text-amber-400 transition-colors drop-shadow-md">Assurance taxi</div>
                  <div className="text-xs text-gray-600 group-hover:text-amber-400 transition-colors drop-shadow-md">Devis gratuit</div>
                </a>
              ))}
            </div>
          </div>

          {/* FAQ SEO */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-white mb-8 text-center drop-shadow-lg">
              Questions Fréquentes Assurance Taxi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="ai-card p-6 hover:shadow-blue-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-3 drop-shadow-lg">
                  Quel est le prix d'une assurance taxi ?
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed drop-shadow-md">
                  Le <strong className="text-amber-400">prix assurance taxi</strong> varie de 1200€ à 2500€/an selon votre zone d'activité, 
                  votre expérience et votre véhicule. Avec TaxiAssur, nos clients économisent en moyenne 35% 
                  grâce à nos <strong className="text-green-400">tarifs assurance taxi</strong> négociés.
                </p>
              </div>

              <div className="ai-card p-6 hover:shadow-green-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-3 drop-shadow-lg">
                  Comment obtenir un devis assurance taxi ?
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed drop-shadow-md">
                  Obtenez votre <strong className="text-amber-400">devis assurance taxi gratuit</strong> en 2 minutes avec TaxiAssur. 
                  Remplissez notre formulaire en ligne et recevez votre proposition personnalisée 
                  sous 15 minutes par nos experts.
                </p>
              </div>

              <div className="ai-card p-6 hover:shadow-purple-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-3 drop-shadow-lg">
                  Qu'est-ce que la RC professionnelle taxi ?
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed drop-shadow-md">
                  La <strong className="text-amber-400">RC professionnelle taxi</strong> couvre votre responsabilité civile en tant que 
                  professionnel du transport. Elle est obligatoire et distincte de l'assurance véhicule. 
                  TaxiAssur l'inclut systématiquement dans ses offres.
                </p>
              </div>

              <div className="ai-card p-6 hover:shadow-amber-500/40 transition-all duration-300">
                <h4 className="font-bold text-white mb-3 drop-shadow-lg">
                  Peut-on avoir une assurance taxi pas cher ?
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed drop-shadow-md">
                  Oui ! Une <strong className="text-amber-400">assurance taxi pas cher</strong> est possible avec un courtier spécialisé. 
                  TaxiAssur négocie des tarifs préférentiels permettant jusqu'à 35% d\'économies 
                  sans compromis sur les garanties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SEOContent;