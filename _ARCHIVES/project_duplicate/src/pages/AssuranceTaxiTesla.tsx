import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Zap, Battery, TrendingDown, Shield } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceTaxiTesla: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Taxi Tesla : Tarifs Model 3 & Model Y 2024</title>
        <meta name="description" content="Assurance Tesla taxi dès 1,380€/an (-10% électrique). Model 3, Model Y pour taxis. RC Pro incluse, recharge gratuite." />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-taxi-tesla" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-green-400 text-gray-900 font-semibold px-6 py-3 rounded-full mb-6">
                <Zap size={24} className="mr-2" />
                <span className="font-bold">Taxi Électrique</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-6">
                Assurance Taxi Tesla<br />
                <span className="text-green-400">-10% Électrique</span>
              </h1>
              <p className="text-2xl mb-8">Model 3 • Model Y • RC Pro Incluse • 1,380€/an</p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-green-400 mb-2">1,380€</div>
                  <div className="text-sm">Dès /an</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-green-400 mb-2">-10%</div>
                  <div className="text-sm">Réduction électrique</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="text-4xl font-black text-green-400 mb-2">491 km</div>
                  <div className="text-sm">Autonomie Model 3</div>
                </div>
              </div>

              <a href="#devis" className="inline-block bg-green-400 hover:bg-green-500 text-gray-900 font-semibold font-bold text-xl px-12 py-5 rounded-xl transition-all">
                Devis Tesla Taxi →
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Tesla Taxi : Pourquoi C'est Rentable</h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-green-300">
                  <Zap className="text-green-600 mb-4" size={48} />
                  <h3 className="text-2xl font-bold mb-4">Économies Carburant</h3>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex justify-between items-center">
                      <span>Diesel (40,000 km/an)</span>
                      <span className="font-bold text-red-600">6,400€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tesla (40,000 km/an)</span>
                      <span className="font-bold text-green-600">2,400€</span>
                    </div>
                    <div className="pt-3 border-t-2 border-green-300">
                      <div className="flex justify-between items-center font-black text-lg">
                        <span>Économie/an</span>
                        <span className="text-green-600">4,000€</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-300">
                  <Shield className="text-yellow-600 mb-4" size={48} />
                  <h3 className="text-2xl font-bold mb-4">Économies Assurance</h3>
                  <div className="space-y-3 text-gray-700">
                    <div className="flex justify-between items-center">
                      <span>Diesel classique</span>
                      <span className="font-bold">1,540€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Réduction électrique -10%</span>
                      <span className="font-bold text-green-600">-154€</span>
                    </div>
                    <div className="pt-3 border-t-2 border-orange-300">
                      <div className="flex justify-between items-center font-black text-lg">
                        <span>Tesla taxi/an</span>
                        <span className="text-yellow-600">1,386€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-900 text-white rounded-2xl p-8 text-center">
                <div className="text-4xl font-black mb-4">Économie Totale : 4,154€/an</div>
                <p className="text-xl text-green-200">Carburant + Assurance vs Diesel</p>
                <p className="text-sm mt-4">Soit 346€/mois économisés • Amortissement Tesla accéléré</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Prix Assurance Tesla Taxi par Ville</h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <tr>
                      <th className="p-4 text-left">Ville</th>
                      <th className="p-4 text-center">Diesel</th>
                      <th className="p-4 text-center">Tesla</th>
                      <th className="p-4 text-center">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-4 font-semibold">Paris</td>
                      <td className="p-4 text-center">2,080€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,872€</td>
                      <td className="p-4 text-center"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">-208€</span></td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Lyon</td>
                      <td className="p-4 text-center">1,690€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,521€</td>
                      <td className="p-4 text-center"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">-169€</span></td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Marseille</td>
                      <td className="p-4 text-center">1,750€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,575€</td>
                      <td className="p-4 text-center"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">-175€</span></td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Province moyenne</td>
                      <td className="p-4 text-center">1,540€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,386€</td>
                      <td className="p-4 text-center"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">-154€</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Model 3 vs Model Y pour Taxi</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white border-2 border-orange-200 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center">Tesla Model 3</h3>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-black text-yellow-600 mb-2">42,000€</div>
                    <div className="text-gray-600">Prix neuf</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Battery className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Autonomie :</strong> 491 km WLTP</span>
                    </li>
                    <li className="flex items-start">
                      <Zap className="text-yellow-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Charge :</strong> 0-80% en 27 min (Supercharger)</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Coffre :</span>
                      <span className="font-bold">542 L</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Places :</span>
                      <span className="font-bold">5</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Assurance :</span>
                      <span className="font-bold text-green-600">1,386€/an</span>
                    </li>
                  </ul>
                  <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-xl">
                    <p className="text-sm"><strong>Idéal pour :</strong> Taxis urbains, trajets courts-moyens, rentabilité maximum</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-yellow-500 rounded-2xl p-8">
                  <div className="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    SUV
                  </div>
                  <h3 className="text-2xl font-bold mb-6 text-center">Tesla Model Y</h3>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-black text-yellow-600 mb-2">49,000€</div>
                    <div className="text-gray-600">Prix neuf</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <Battery className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Autonomie :</strong> 533 km WLTP</span>
                    </li>
                    <li className="flex items-start">
                      <Zap className="text-yellow-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Charge :</strong> 0-80% en 27 min (Supercharger)</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Coffre :</span>
                      <span className="font-bold">854 L (+ bagages)</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Places :</span>
                      <span className="font-bold">5 (ou 7 option)</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Assurance :</span>
                      <span className="font-bold text-yellow-600">1,490€/an</span>
                    </li>
                  </ul>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-xl">
                    <p className="text-sm"><strong>Idéal pour :</strong> Aéroports, familles, longs trajets, confort premium</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white border border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Questions Fréquentes Tesla Taxi</h2>

              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Autonomie Tesla suffisante pour taxi ?</h3>
                  <p className="text-gray-700">
                    Oui, Model 3 = 491 km théorique soit ~350-400 km réels. Pour taxi urbain faisant 200-250 km/jour,
                    1 recharge/jour suffit (20-30 min Supercharger). Réseau Supercharger dense en France (600+ stations).
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Temps de charge Tesla taxi ?</h3>
                  <p className="text-gray-700">
                    <strong>Supercharger V3 :</strong> 0-80% en 27 minutes (200 kW). Pendant pause déjeuner ou fin service.
                    <strong>Borne 11 kW :</strong> Charge complète en 8h (nuit à domicile). Coût : 6€/100 km vs 16€ diesel.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Fiabilité Tesla pour usage intensif ?</h3>
                  <p className="text-gray-700">
                    Excellent. Taxis Tesla Uber/G7 atteignent 400,000-500,000 km sans problème majeur. Entretien réduit (pas vidange,
                    embrayage, échappement). Seuls freins, pneus, filtres à changer. Économie entretien : 60-70% vs thermique.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-3">Rentabilité Tesla taxi ?</h3>
                  <p className="text-gray-700">
                    <strong>Surcoût achat :</strong> +15,000€ vs diesel équivalent. <strong>Économies annuelles :</strong> 4,000€ carburant +
                    1,500€ entretien + 154€ assurance = 5,654€/an. <strong>Amortissement : 2.6 ans</strong>. Après, économies pures.
                    + Bonus écologique 5,000€ (2024).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="devis" className="py-16 bg-gradient-to-br from-green-600 to-green-700 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black mb-4">Assurez Votre Tesla Taxi Maintenant</h2>
                <p className="text-xl">-10% électrique • RC Pro incluse • Attestation 10 min</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Zap className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">Réduction Électrique</div>
                    <p>-10% automatique sur votre prime Tesla</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <Battery className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">Spécialiste Tesla</div>
                    <p>Expertise véhicules électriques taxi</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <TrendingDown className="mb-3" size={32} />
                    <div className="text-2xl font-black mb-2">Économie Globale</div>
                    <p>4,154€/an vs diesel (carburant + assurance)</p>
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

export default AssuranceTaxiTesla;
