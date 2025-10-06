import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { TrendingDown, Check, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const ComparateurAXA: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>AXA Assurance Taxi vs TaxiAssur : Comparatif Prix 2024</title>
        <meta name="description" content="Comparatif AXA Pro Taxi vs TaxiAssur : prix, garanties, avis. Économisez jusqu'à 970€/an. Devis gratuit 2 min." />
        <link rel="canonical" href="https://www.taxiassur.com/comparateur-axa-taxi" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        <section className="bg-gradient-to-br from-blue-900 to-blue-800 text-white py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-black mb-6">
                AXA Taxi vs TaxiAssur<br />
                <span className="text-yellow-400">Comparatif Complet 2024</span>
              </h1>
              <p className="text-xl mb-8">Prix • Garanties • Avis Clients • Économies</p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Comparatif Prix AXA vs TaxiAssur</h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-gray-400">
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold mb-2">AXA Pro Taxi</div>
                    <div className="text-5xl font-black text-gray-700 mb-2">2,400€</div>
                    <div className="text-gray-600">par an</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>RC auto professionnel</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Tous risques</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Assistance</span>
                    </li>
                    <li className="flex items-start">
                      <X className="text-red-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>RC Pro en option (+400€)</span>
                    </li>
                    <li className="flex items-start">
                      <X className="text-red-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Protection juridique option (+150€)</span>
                    </li>
                  </ul>
                  <div className="mt-6 pt-6 border-t">
                    <div className="font-bold text-red-600">Prix réel : 2,950€/an</div>
                    <div className="text-sm text-gray-600">Avec RC Pro + Protection juridique</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-xl p-8 border-t-4 border-green-600 relative">
                  <div className="absolute -top-3 right-4 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    -35% RECOMMANDÉ
                  </div>
                  <div className="text-center mb-6">
                    <div className="text-2xl font-bold mb-2">TaxiAssur</div>
                    <div className="text-5xl font-black text-green-600 mb-2">1,430€</div>
                    <div className="text-gray-600">par an</div>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>RC Pro incluse</strong></span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Tous risques</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Assistance 0 km 24/7</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Protection juridique offerte</strong></span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span>Véhicule remplacement inclus</span>
                    </li>
                  </ul>
                  <div className="mt-6 pt-6 border-t border-green-300">
                    <div className="font-bold text-green-700 text-xl">Prix tout compris : 1,430€/an</div>
                    <div className="text-sm text-green-800">Aucune option cachée</div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-8 rounded-r-2xl">
                <div className="flex items-center justify-center mb-4">
                  <TrendingDown className="text-yellow-600 mr-3" size={48} />
                  <div>
                    <div className="text-3xl font-black text-yellow-900">Économisez 1,520€/an</div>
                    <div className="text-lg text-gray-700">Soit 127€/mois avec TaxiAssur</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Tableau Comparatif Détaillé</h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <tr>
                      <th className="p-4 text-left">Critère</th>
                      <th className="p-4 text-center">AXA Pro</th>
                      <th className="p-4 text-center">TaxiAssur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-4 font-semibold">Prix base/an</td>
                      <td className="p-4 text-center">2,400€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,430€</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">RC Professionnelle</td>
                      <td className="p-4 text-center">+400€ option</td>
                      <td className="p-4 text-center text-green-600 font-bold">✓ Incluse</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Protection juridique</td>
                      <td className="p-4 text-center">+150€ option</td>
                      <td className="p-4 text-center text-green-600 font-bold">✓ Offerte</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Véhicule remplacement</td>
                      <td className="p-4 text-center">Option</td>
                      <td className="p-4 text-center text-green-600 font-bold">✓ Inclus</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Souscription en ligne</td>
                      <td className="p-4 text-center">Non (agence)</td>
                      <td className="p-4 text-center text-green-600 font-bold">✓ 5 min</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-semibold">Attestation</td>
                      <td className="p-4 text-center">48-72h</td>
                      <td className="p-4 text-center text-green-600 font-bold">✓ 10 min</td>
                    </tr>
                    <tr className="bg-gray-50 font-bold">
                      <td className="p-4">TOTAL RÉEL/AN</td>
                      <td className="p-4 text-center text-red-600 text-xl">2,950€</td>
                      <td className="p-4 text-center text-green-600 text-xl">1,430€</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-black text-center mb-12">Avis Clients</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="font-bold mb-2">Mohammed T. - Paris</div>
                  <div className="text-yellow-500 mb-3">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 italic">
                    "Ancien client AXA, je payais 2,800€/an. Chez TaxiAssur, 1,820€ pour mêmes garanties + RC Pro incluse.
                    Économie 980€/an ! En plus, souscription en ligne hyper rapide."
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="font-bold mb-2">Jean-Marc L. - Lyon</div>
                  <div className="text-yellow-500 mb-3">⭐⭐⭐⭐⭐</div>
                  <p className="text-gray-700 italic">
                    "AXA refusait de m'assurer après 2 sinistres. TaxiAssur m'a accepté avec surprime raisonnable.
                    Service client excellent, conseiller très pro."
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
                <h2 className="text-4xl font-black mb-4">
                  Économisez 1,520€/an en Changeant pour TaxiAssur
                </h2>
                <p className="text-xl">Même couverture • RC Pro incluse • Souscription 5 min</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-2xl font-black mb-2">-35% Garanti</div>
                    <p>Tarifs négociés avec grands assureurs</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-2xl font-black mb-2">RC Pro Incluse</div>
                    <p>Économie 400€/an vs AXA</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-2xl font-black mb-2">Attestation 10 min</div>
                    <p>vs 48-72h chez AXA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto text-center">
              <h3 className="text-xl font-bold mb-6">Comparer d'autres assureurs</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <Link to="/comparateur-macif-taxi" className="text-blue-600 hover:underline">Macif Taxi</Link>
                <Link to="/comparateur-mfa-taxi" className="text-blue-600 hover:underline">MFA Taxi</Link>
                <Link to="/comparateur-groupama-taxi" className="text-blue-600 hover:underline">Groupama Taxi</Link>
                <Link to="/blog/comparatif-assurances-taxi-2024" className="text-blue-600 hover:underline">Tous Comparatifs</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ComparateurAXA;
