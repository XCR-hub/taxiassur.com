import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, TrendingDown, Shield, Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiVTCCombine: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi + VTC Combinée : Double Activité -40%</title>
        <meta name="description" content="Assurance taxi ET VTC sur même contrat. Économisez -40% vs 2 assurances séparées. RC Pro double activité incluse. Devis 2 min." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-vtc-combine" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-yellow-400 text-purple-900 px-6 py-3 rounded-full mb-6">
                <Users size={24} className="mr-2" />
                <span className="font-bold">Double Activité</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6">
                Assurance Taxi + VTC<br />
                <span className="text-yellow-400">Sur Même Contrat</span>
              </h1>
              <p className="text-2xl mb-8">Un Seul Contrat • RC Pro Double • -40% vs Séparé</p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">2,340€</div>
                  <div className="text-sm">Taxi + VTC/an</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">-40%</div>
                  <div className="text-sm">vs 2 contrats</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-yellow-400 mb-2">1 seul</div>
                  <div className="text-sm">Contrat unique</div>
                </div>
              </div>

              <a href="#devis" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold text-xl px-12 py-5 rounded-xl transition-all">
                Devis Combiné →
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Pourquoi Cumul Taxi + VTC ?</h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold mb-6">Avantages Cumul</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <strong>Revenus maximisés :</strong> Maraude taxi + applications VTC (Uber, Bolt, Heetch)
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <strong>Flexibilité totale :</strong> Choisir meilleure option selon moment
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <strong>Occupation optimale :</strong> Moins de temps mort
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <strong>Diversification :</strong> Pas dépendant d'une seule source
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl shadow-lg p-8 border-2 border-purple-300">
                  <h3 className="text-2xl font-bold mb-6">Revenus Comparés</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold">Taxi seul</span>
                        <span className="font-bold">2,800€/mois</span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold">VTC seul</span>
                        <span className="font-bold">2,600€/mois</span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3">
                        <div className="bg-green-600 h-3 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-semibold text-purple-900">Taxi + VTC</span>
                        <span className="font-bold text-purple-900">3,800€/mois</span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3">
                        <div className="bg-purple-600 h-3 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t-2 border-purple-300">
                    <div className="text-center">
                      <div className="text-3xl font-black text-purple-900">+1,000€/mois</div>
                      <div className="text-sm text-gray-700">Gain moyen cumul</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Comparatif Prix Assurance</h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                    <tr>
                      <th className="p-4 text-left">Formule</th>
                      <th className="p-4 text-center">Prix/an</th>
                      <th className="p-4 text-center">RC Pro</th>
                      <th className="p-4 text-center">Flexibilité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="bg-red-50">
                      <td className="p-4 font-semibold">2 Contrats Séparés</td>
                      <td className="p-4 text-center text-red-600 font-bold">3,900€</td>
                      <td className="p-4 text-center">2 RC Pro distinctes</td>
                      <td className="p-4 text-center">Changement compliqué</td>
                    </tr>
                    <tr className="bg-green-50">
                      <td className="p-4 font-semibold">Contrat Combiné TaxiAssur</td>
                      <td className="p-4 text-center text-green-600 font-bold">2,340€</td>
                      <td className="p-4 text-center">RC Pro double activité</td>
                      <td className="p-4 text-center">Switch instantané</td>
                    </tr>
                    <tr className="bg-yellow-50">
                      <td className="p-4 font-black">ÉCONOMIE</td>
                      <td className="p-4 text-center font-black text-2xl text-yellow-900">-1,560€</td>
                      <td className="p-4 text-center font-bold text-green-600">1 seule RC Pro</td>
                      <td className="p-4 text-center font-bold text-green-600">100% flexible</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                <div className="flex items-center">
                  <TrendingDown className="text-yellow-600 mr-3" size={48} />
                  <div>
                    <div className="text-2xl font-black text-yellow-900 mb-1">Économisez 1,560€/an</div>
                    <p className="text-gray-700">Soit 130€/mois avec assurance combinée vs 2 contrats séparés</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Garanties Assurance Combinée</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center mb-6">
                    <Shield className="text-purple-600 mr-3" size={48} />
                    <h3 className="text-2xl font-bold">Activité Taxi</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>RC Pro maraude illimitée</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Protection stations taxi</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Couverture lumineux taxi</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Garantie équipements pro</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg">
                  <div className="flex items-center mb-6">
                    <Users className="text-indigo-600 mr-3" size={48} />
                    <h3 className="text-2xl font-bold">Activité VTC</h3>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>RC Pro applications (Uber, Bolt...)</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Couverture réservation plateforme</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Protection litiges passagers</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Garantie commission plateforme</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 bg-purple-50 border-2 border-purple-300 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">+ Garanties Communes</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>✓ Tous risques véhicule</div>
                  <div>✓ Protection juridique</div>
                  <div>✓ Assistance 0 km 24/7</div>
                  <div>✓ Véhicule remplacement</div>
                  <div>✓ Garantie conducteur</div>
                  <div>✓ Bris de glace</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Questions Fréquentes</h2>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Puis-je vraiment cumuler taxi et VTC ?</h3>
                  <p className="text-gray-700">
                    Oui, c'est légal si vous avez carte professionnelle taxi + carte VTC. Vous pouvez exercer les 2 activités avec même véhicule. Notre assurance combinée couvre les 2 simultanément.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Faut-il choisir taxi OU VTC à chaque course ?</h3>
                  <p className="text-gray-700">
                    Non, vous êtes libre. Vous pouvez faire maraude taxi le matin, puis activer Uber l'après-midi. Assurance couvre automatiquement selon activité du moment. Flexibilité totale.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Prix 2,340€ inclut vraiment les 2 activités ?</h3>
                  <p className="text-gray-700">
                    Oui, 2,340€/an couvre taxi ET VTC sur même contrat. RC Pro double activité incluse. vs 1,430€ taxi seul + 2,470€ VTC seul = 3,900€ si séparé. Économie 1,560€/an.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Comment prouver quelle activité en cas de sinistre ?</h3>
                  <p className="text-gray-700">
                    Notre assurance couvre les 2 en permanence donc pas besoin de prouver. Que vous soyez en maraude taxi ou sur Uber au moment accident, vous êtes couvert. Simple et sans tracas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="devis" className="py-16 bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4">Obtenez Votre Assurance Combinée Maintenant</h2>
                <p className="text-xl">Taxi + VTC • Un Seul Contrat • Économisez 1,560€/an</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Users className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">Double Activité</div>
                    <p>Taxi + VTC sur même contrat</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <TrendingDown className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">-40% vs Séparé</div>
                    <p>Économie 1,560€/an garantie</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Shield className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">RC Pro Double</div>
                    <p>Couverture totale 2 activités</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceTaxiVTCCombine;
