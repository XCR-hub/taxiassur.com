import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import FormLead from '../components/FormLead';
import { DollarSign, TrendingDown, Calculator, MapPin, Car, Shield, Users, CheckCircle } from 'lucide-react';

const PrixAssuranceTaxi: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Prix Assurance Taxi 2024 : Coût Moyen & Tarifs | Guide Complet TaxiAssur"
        description="💰 Prix assurance taxi : 1200€-3500€/an. Découvrez les tarifs moyens par ville, facteurs de prix, et comment économiser 35% avec TaxiAssur. Guide complet 2024."
        keywords="prix assurance taxi, taxi insurance cost, cout assurance taxi, tarif assurance taxi, how much is taxi insurance, combien coute assurance taxi, prix moyen assurance taxi, tarif assurance taxi paris, prix assurance taxi lyon, assurance taxi pas cher"
        canonical="/prix-assurance-taxi"
      />

      <JsonLd type="breadcrumb" data={[
        { name: 'Accueil', url: '/' },
        { name: 'Prix Assurance Taxi', url: '/prix-assurance-taxi' }
      ]} />

      <JsonLd type="faq" data={[
        {
          question: "Quel est le prix moyen d'une assurance taxi en France ?",
          answer: "Le prix moyen d'une assurance taxi en France varie entre 1200€ et 3500€ par an. Ce tarif dépend de votre localisation, votre expérience, le type de véhicule et les garanties choisies. Avec TaxiAssur, économisez en moyenne 35% grâce à nos tarifs négociés avec 15 assureurs partenaires."
        },
        {
          question: "How much is taxi insurance in France?",
          answer: "Taxi insurance cost in France ranges from €1,200 to €3,500 per year on average. The exact price depends on location (Paris being more expensive), driver experience, vehicle type, and coverage level. TaxiAssur offers cheap taxi insurance with up to 35% savings."
        },
        {
          question: "Quels facteurs influencent le prix d'une assurance taxi ?",
          answer: "7 facteurs clés : 1) Localisation (Paris +40% vs province), 2) Âge et expérience conducteur, 3) Type de véhicule et valeur, 4) Historique sinistres (bonus-malus), 5) Kilométrage annuel, 6) Niveau de garanties (RC Pro, tous risques), 7) Franchise choisie."
        },
        {
          question: "Comment réduire le coût de mon assurance taxi ?",
          answer: "5 astuces : 1) Comparer 15+ devis (TaxiAssur le fait gratuitement), 2) Négocier avec un courtier spécialisé, 3) Augmenter la franchise, 4) Installer équipements sécurité (dashcam, alarme), 5) Regrouper plusieurs véhicules. Économie moyenne : 35%."
        }
      ]} />

      <Header />

      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-900 via-blue-800 to-orange-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center space-x-2 bg-yellow-600/50 px-4 py-2 rounded-full mb-6">
                <DollarSign size={20} className="text-yellow-400" />
                <span className="text-sm font-semibold">Guide Tarifs 2024</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Prix Assurance Taxi : <span className="text-yellow-400">Coût Moyen & Tarifs 2024</span>
              </h1>

              <p className="text-xl text-yellow-100 mb-8">
                Découvrez combien coûte réellement une assurance taxi en France et comment économiser jusqu'à 35% avec TaxiAssur
              </p>

              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center space-x-2 bg-orange-800/50 px-4 py-2 rounded-lg">
                  <Calculator className="text-green-400" size={16} />
                  <span>Calculateur de prix</span>
                </div>
                <div className="flex items-center space-x-2 bg-orange-800/50 px-4 py-2 rounded-lg">
                  <TrendingDown className="text-red-400" size={16} />
                  <span>Économie 35%</span>
                </div>
                <div className="flex items-center space-x-2 bg-orange-800/50 px-4 py-2 rounded-lg">
                  <Shield className="text-yellow-400" size={16} />
                  <span>Devis gratuit 2min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prix Moyen Section */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                <DollarSign className="inline text-green-600 mb-1" size={32} />
                {' '}Prix Moyen Assurance Taxi en France
              </h2>

              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-300 text-center">
                  <div className="text-sm text-green-700 font-semibold mb-2">PRIX MINIMUM</div>
                  <div className="text-4xl font-bold text-green-600 mb-2">1 200€</div>
                  <div className="text-sm text-gray-600">par an</div>
                  <div className="mt-4 text-xs text-gray-700">
                    Profil optimal : +10 ans expérience, province, véhicule standard
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-400 text-center transform scale-105 shadow-lg">
                  <div className="text-sm text-yellow-700 font-semibold mb-2">PRIX MOYEN</div>
                  <div className="text-5xl font-bold text-yellow-600 mb-2">2 200€</div>
                  <div className="text-sm text-gray-600">par an</div>
                  <div className="mt-4 text-xs text-gray-700 font-medium">
                    Profil standard : 5 ans exp, grande ville, garanties complètes
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border-2 border-red-300 text-center">
                  <div className="text-sm text-red-700 font-semibold mb-2">PRIX MAXIMUM</div>
                  <div className="text-4xl font-bold text-red-600 mb-2">3 500€</div>
                  <div className="text-sm text-gray-600">par an</div>
                  <div className="mt-4 text-xs text-gray-700">
                    Jeune conducteur, Paris, véhicule haut de gamme, sinistres récents
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                <div className="flex items-start space-x-3">
                  <TrendingDown className="text-yellow-600 mt-1 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-2">Économisez 35% avec TaxiAssur !</h3>
                    <p className="text-yellow-800 text-sm mb-3">
                      Grâce à notre réseau de 15 assureurs partenaires, nous négocions des tarifs préférentiels impossibles à obtenir en direct.
                    </p>
                    <p className="text-yellow-900 font-semibold">
                      Prix moyen client TaxiAssur : <span className="text-2xl">1 430€</span> au lieu de 2 200€
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tableau Prix par Ville */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">
                <MapPin className="inline text-yellow-600 mb-1" size={32} />
                {' '}Prix Assurance Taxi par Ville
              </h2>
              <p className="text-center text-gray-600 mb-12">Tarifs moyens constatés selon la localisation (2024)</p>

              <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
                <table className="w-full">
                  <thead className="bg-yellow-500 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Ville</th>
                      <th className="px-6 py-4 text-center">Prix Moyen</th>
                      <th className="px-6 py-4 text-center">Écart vs Moyenne</th>
                      <th className="px-6 py-4 text-center">Tarif TaxiAssur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Paris (75)</td>
                      <td className="px-6 py-4 text-center text-red-600 font-bold">3 200€</td>
                      <td className="px-6 py-4 text-center text-red-600">+45%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">2 080€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Lyon (69)</td>
                      <td className="px-6 py-4 text-center font-bold">2 500€</td>
                      <td className="px-6 py-4 text-center text-orange-600">+14%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 625€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Marseille (13)</td>
                      <td className="px-6 py-4 text-center font-bold">2 400€</td>
                      <td className="px-6 py-4 text-center text-orange-600">+9%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 560€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Toulouse (31)</td>
                      <td className="px-6 py-4 text-center font-bold">2 100€</td>
                      <td className="px-6 py-4 text-center text-yellow-600">-5%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 365€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Nice (06)</td>
                      <td className="px-6 py-4 text-center font-bold">2 300€</td>
                      <td className="px-6 py-4 text-center text-orange-600">+5%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 495€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Bordeaux (33)</td>
                      <td className="px-6 py-4 text-center font-bold">2 000€</td>
                      <td className="px-6 py-4 text-center text-green-600">-9%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 300€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50">
                      <td className="px-6 py-4 font-semibold">Lille (59)</td>
                      <td className="px-6 py-4 text-center font-bold">2 150€</td>
                      <td className="px-6 py-4 text-center text-yellow-600">-2%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 398€</td>
                    </tr>
                    <tr className="hover:bg-yellow-50 bg-green-50">
                      <td className="px-6 py-4 font-semibold">Province (autres villes)</td>
                      <td className="px-6 py-4 text-center font-bold">1 800€</td>
                      <td className="px-6 py-4 text-center text-green-600">-18%</td>
                      <td className="px-6 py-4 text-center text-green-600 font-bold">1 170€</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/villes"
                  className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                >
                  <MapPin size={20} />
                  <span>Voir toutes les villes couvertes</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Facteurs Prix */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">
                7 Facteurs qui Influencent le Prix de Votre Assurance Taxi
              </h2>
              <p className="text-center text-gray-600 mb-12">
                Comprendre ces éléments vous permet de mieux négocier votre tarif
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-yellow-500 text-white rounded-full p-3 flex-shrink-0">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">1. Localisation Géographique</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Paris et grandes métropoles : +40% à +50% par rapport à la province
                      </p>
                      <p className="text-gray-600 text-xs">
                        Impact du trafic dense, risques accidents plus élevés, coût pièces et réparations
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-600 text-white rounded-full p-3 flex-shrink-0">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">2. Âge & Expérience Conducteur</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Jeune conducteur (-25 ans) : +60% / Senior (+10 ans) : -25%
                      </p>
                      <p className="text-gray-600 text-xs">
                        Historique conduite, années d'expérience taxi, ancienneté permis
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-900 text-white rounded-full p-3 flex-shrink-0">
                      <Car size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">3. Type & Valeur Véhicule</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Véhicule standard : 1800€ / Premium (Tesla, Mercedes) : 3000€+
                      </p>
                      <p className="text-gray-600 text-xs">
                        Coût pièces détachées, valeur à neuf, coût réparations, risque vol
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-red-600 text-white rounded-full p-3 flex-shrink-0">
                      <TrendingDown size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">4. Bonus-Malus (CRM)</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Bonus maximal (0.50) : -50% / Malus (1.50) : +50%
                      </p>
                      <p className="text-gray-600 text-xs">
                        Historique sinistres 5 dernières années, accidents responsables
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-yellow-600 text-white rounded-full p-3 flex-shrink-0">
                      <Calculator size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">5. Kilométrage Annuel</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        -30,000 km/an : tarif normal / +60,000 km/an : +20%
                      </p>
                      <p className="text-gray-600 text-xs">
                        Plus de kilomètres = plus d'exposition au risque accident
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-yellow-500 text-white rounded-full p-3 flex-shrink-0">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">6. Niveau de Garanties</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        RC Pro seule : 1200€ / Tous risques + options : 3000€
                      </p>
                      <p className="text-gray-600 text-xs">
                        Garanties incluses, plafonds indemnisation, options (bris glace, vol)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50 p-6 rounded-xl border-2 border-teal-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-teal-600 text-white rounded-full p-3 flex-shrink-0">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">7. Franchise Choisie</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Franchise 150€ : +200€/an / Franchise 1000€ : -300€/an
                      </p>
                      <p className="text-gray-600 text-xs">
                        Montant restant à charge en cas de sinistre (inverse proportionnel à la prime)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-pink-50 p-6 rounded-xl border-2 border-pink-200">
                  <div className="flex items-start space-x-4">
                    <div className="bg-pink-600 text-white rounded-full p-3 flex-shrink-0">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Bonus : Équipements Sécurité</h3>
                      <p className="text-gray-700 text-sm mb-2">
                        Dashcam + alarme + éthylotest : -10% à -15%
                      </p>
                      <p className="text-gray-600 text-xs">
                        Dispositifs anti-vol, caméra embarquée, système télématique
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Devis */}
        <section className="py-16 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-500">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Obtenez Votre Prix Exact en 2 Minutes
                  </h2>
                  <p className="text-xl text-gray-600">
                    Devis gratuit personnalisé selon votre profil • Sans engagement • Réponse 15min
                  </p>
                </div>

                <FormLead source="prix-assurance-taxi" />

                <div className="mt-8 grid md:grid-cols-3 gap-4 text-center text-sm">
                  <div className="flex items-center justify-center space-x-2 text-green-700">
                    <CheckCircle size={16} />
                    <span>Économie 35% garantie</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-yellow-700">
                    <CheckCircle size={16} />
                    <span>15 assureurs comparés</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-orange-700">
                    <CheckCircle size={16} />
                    <span>Expert dédié</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* English Section - Taxi Insurance Cost */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">
                How Much is Taxi Insurance in France? Complete Guide
              </h2>

              <div className="prose max-w-none">
                <p className="text-lg text-gray-700 mb-6">
                  If you're wondering <strong>"how much is taxi insurance"</strong> in France, here's a comprehensive breakdown
                  of <strong>taxi insurance costs</strong> and what influences pricing.
                </p>

                <h3 className="text-2xl font-bold mb-4">Average Taxi Insurance Cost in France</h3>
                <p className="text-gray-700 mb-4">
                  The <strong>average cost of taxi insurance</strong> in France ranges from <strong>€1,200 to €3,500 per year</strong>.
                  This wide range depends on several factors:
                </p>

                <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                  <li><strong>Location</strong>: Paris taxi insurance costs 40-50% more than provincial cities</li>
                  <li><strong>Driver experience</strong>: New drivers pay up to 60% more than experienced taxi drivers</li>
                  <li><strong>Vehicle type</strong>: Standard vehicles (€1,800/year) vs premium cars (€3,000+/year)</li>
                  <li><strong>Coverage level</strong>: Basic RC Pro (€1,200) vs comprehensive all-risks (€3,000)</li>
                  <li><strong>Claims history</strong>: Bonus-malus coefficient significantly impacts premiums</li>
                </ul>

                <h3 className="text-2xl font-bold mb-4">What Makes <strong>Insurance for Taxi</strong> More Expensive?</h3>
                <p className="text-gray-700 mb-4">
                  <strong>Insurance for taxi drivers</strong> costs more than personal car insurance because:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                  <li>Higher annual mileage (30,000-60,000 km vs 15,000 km for personal use)</li>
                  <li>Increased accident exposure due to urban driving and traffic</li>
                  <li>Mandatory RC Professionnelle (Professional Liability) coverage</li>
                  <li>Passenger transportation liability requirements</li>
                  <li>24/7 coverage needed for round-the-clock operations</li>
                </ul>

                <h3 className="text-2xl font-bold mb-4">Finding <strong>Cheap Taxi Insurance</strong></h3>
                <p className="text-gray-700 mb-4">
                  Want <strong>cheap taxi insurance</strong> without compromising coverage? TaxiAssur specializes in affordable
                  <strong> insurance for taxi company</strong> and independent drivers. Our broker service compares 15+ insurers
                  to find you the best rates.
                </p>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
                  <p className="text-orange-900 font-semibold">
                    Average savings with TaxiAssur: <span className="text-2xl">35%</span>
                  </p>
                  <p className="text-yellow-800 text-sm mt-2">
                    Our clients pay an average of €1,430/year instead of €2,200 — that's €770 saved annually!
                  </p>
                </div>

                <h3 className="text-2xl font-bold mb-4">Get Your Free Taxi Insurance Quote</h3>
                <p className="text-gray-700 mb-4">
                  Ready to find out exactly <strong>how much is taxi insurance</strong> for your specific situation?
                  Get a free, personalized quote in 2 minutes with TaxiAssur — France's leading <strong>insurance broker for taxi</strong> drivers.
                </p>

                <div className="text-center mt-8">
                  <a
                    href="#devis"
                    className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all"
                  >
                    Get Free Quote →
                  </a>
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

export default PrixAssuranceTaxi;
