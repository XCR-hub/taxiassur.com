import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Bike, Zap, Shield, Clock, Check, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import EnhancedLeadForm from '../components/EnhancedLeadForm';

const AssuranceMotoTaxi: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Assurance Moto Taxi : Tarifs & Devis 2024 | TaxiAssur</title>
        <meta
          name="description"
          content="Assurance Moto Taxi dès 1,300€/an. Couverture complète transport passagers moto, RC Pro incluse, garanties spécifiques deux-roues. Devis gratuit 2 min."
        />
        <meta name="keywords" content="assurance moto taxi, assurance taxi moto, moto taxi assurance, prix assurance moto taxi" />
        <link rel="canonical" href="https://www.taxiassur.com/assurance-moto-taxi" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Qu'est-ce qu'un moto-taxi ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Le moto-taxi est un service de transport de personnes sur moto. Le passager voyage sur le siège arrière équipé d'un dossier, avec casque et équipements de sécurité fournis. Autorisé uniquement dans certaines grandes villes (Paris, Lyon, Marseille, Nice). Licence professionnelle obligatoire."
                }
              },
              {
                "@type": "Question",
                "name": "Quel est le prix d'une assurance moto-taxi ?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Prix moyen assurance moto-taxi : 1,800€/an. Avec TaxiAssur, à partir de 1,300€/an incluant RC Pro illimitée, garanties passagers, protection conducteur, assistance 0 km et véhicule de remplacement."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-orange-900 via-orange-800 to-red-900 text-white py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center bg-yellow-400 text-orange-900 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Bike size={16} className="mr-2" />
                Transport Passagers Moto
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                Assurance Moto-Taxi<br />
                <span className="text-yellow-400">Couverture Complète</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-orange-100">
                RC Pro Incluse • Garanties Passagers • Assistance 24/7
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">1,300€</div>
                  <div className="text-sm">Dès /an</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">-30%</div>
                  <div className="text-sm">vs marché</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                  <div className="text-3xl font-black text-yellow-400">2 min</div>
                  <div className="text-sm">Devis</div>
                </div>
              </div>

              <a
                href="#devis"
                className="inline-block bg-yellow-400 hover:bg-yellow-500 text-orange-900 font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-xl"
              >
                Devis Gratuit Moto-Taxi →
              </a>
            </div>
          </div>
        </section>

        {/* C'est quoi moto-taxi */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Moto-Taxi : Transport de Personnes à Moto
              </h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div>
                  <h3 className="text-2xl font-bold mb-4 flex items-center">
                    <Bike className="mr-3 text-orange-600" size={32} />
                    Définition
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Le <strong>moto-taxi</strong> est un service de transport professionnel de personnes sur moto ou scooter.
                    Le passager est installé sur un siège arrière équipé d'un dossier et de repose-pieds.
                  </p>
                  <p className="text-gray-700 mb-4">
                    <strong>Avantages principaux :</strong>
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <Zap className="text-green-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Rapidité :</strong> Évite embouteillages, trajets 2x plus rapides</span>
                    </li>
                    <li className="flex items-start">
                      <Clock className="text-yellow-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Flexibilité :</strong> Accès zones difficiles, circulation fluide</span>
                    </li>
                    <li className="flex items-start">
                      <Shield className="text-orange-600 mr-2 flex-shrink-0 mt-1" size={20} />
                      <span><strong>Sécurité :</strong> Conducteurs formés, équipements pro (casques, gilets)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4">Réglementation</h3>
                  <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-xl mb-4">
                    <p className="font-semibold text-orange-900 mb-2">📋 Obligations légales</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Licence moto-taxi obligatoire</li>
                      <li>✓ Examen capacité transport personnes</li>
                      <li>✓ Permis moto (A ou A2) depuis +2 ans</li>
                      <li>✓ Certificat médical aptitude</li>
                      <li>✓ Casier judiciaire vierge</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
                    <p className="font-semibold text-blue-900 mb-2">🏙️ Zones autorisées</p>
                    <p className="text-sm text-gray-700">
                      Moto-taxi autorisé uniquement dans grandes villes :
                      <strong> Paris, Lyon, Marseille, Nice, Cannes, Bordeaux, Toulouse</strong>.
                      Activité interdite en zone rurale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Assurance spécifique */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Quelle Assurance pour Moto-Taxi ?
              </h2>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-red-600">
                  <div className="flex items-center mb-4">
                    <Shield className="text-red-600 mr-3" size={32} />
                    <h3 className="text-xl font-bold">Obligatoires</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>RC Professionnelle</strong>
                        <p className="text-gray-600">Dommages causés aux tiers</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Assurance moto pro</strong>
                        <p className="text-gray-600">RC moto + usage commercial</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Garantie passagers</strong>
                        <p className="text-gray-600">Protection clients transportés</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-orange-600">
                  <div className="flex items-center mb-4">
                    <Bike className="text-orange-600 mr-3" size={32} />
                    <h3 className="text-xl font-bold">Recommandées</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Garantie conducteur</strong>
                        <p className="text-gray-600">Vos frais médicaux si accident</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Vol + Incendie</strong>
                        <p className="text-gray-600">Protection moto vol/dégâts</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Assistance 0 km</strong>
                        <p className="text-gray-600">Dépannage partout, 24/7</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border-t-4 border-green-600">
                  <div className="flex items-center mb-4">
                    <Zap className="text-green-600 mr-3" size={32} />
                    <h3 className="text-xl font-bold">Options</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Protection juridique</strong>
                        <p className="text-gray-600">Défense litiges clients</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Équipements pro</strong>
                        <p className="text-gray-600">Casques, gilets, accessoires</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-yellow-600 mr-2 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Perte exploitation</strong>
                        <p className="text-gray-600">Indemnité si arrêt activité</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-xl">
                <p className="text-lg font-bold text-red-900 mb-2">
                  ⚠️ Attention : Assurance moto classique insuffisante !
                </p>
                <p className="text-gray-700">
                  Une assurance moto personnelle NE couvre PAS le transport de passagers payants.
                  Il faut <strong>obligatoirement une assurance moto-taxi professionnelle</strong> incluant RC Pro
                  et garantie passagers. Sinon = <strong>refus indemnisation en cas d'accident</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prix par ville */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Tarifs Assurance Moto-Taxi 2024
              </h2>

              <div className="overflow-x-auto mb-12">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                    <tr>
                      <th className="p-4 text-left font-bold">Ville</th>
                      <th className="p-4 text-center font-bold">Prix Marché</th>
                      <th className="p-4 text-center font-bold">TaxiAssur</th>
                      <th className="p-4 text-center font-bold">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-semibold">Paris</td>
                      <td className="p-4 text-center text-red-600 font-bold">2,200€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,540€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -660€/an
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-semibold">Lyon</td>
                      <td className="p-4 text-center text-red-600 font-bold">1,800€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,260€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -540€/an
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-semibold">Marseille</td>
                      <td className="p-4 text-center text-red-600 font-bold">1,900€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,330€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -570€/an
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-semibold">Nice / Cannes</td>
                      <td className="p-4 text-center text-red-600 font-bold">1,700€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,190€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -510€/an
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-orange-50 transition-colors">
                      <td className="p-4 font-semibold">Province (autres)</td>
                      <td className="p-4 text-center text-red-600 font-bold">1,500€</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,050€</td>
                      <td className="p-4 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                          -450€/an
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-8 border-2 border-orange-300">
                  <h3 className="text-2xl font-bold mb-4">Formule Essentielle</h3>
                  <div className="mb-6">
                    <div className="text-4xl font-black text-orange-600">1,300€/an</div>
                    <p className="text-sm text-gray-600">au lieu de 1,800€</p>
                  </div>
                  <ul className="space-y-3 text-sm mb-6">
                    <li className="flex items-start">
                      <Check className="text-orange-600 mr-2 flex-shrink-0 mt-1" />
                      <span>RC Pro illimitée</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-orange-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Assurance moto usage pro</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-orange-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Garantie passagers</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-orange-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Assistance basique</span>
                    </li>
                  </ul>
                  <a
                    href="#devis"
                    className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
                  >
                    Devis Essentielle
                  </a>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-8 border-2 border-green-300 relative">
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    RECOMMANDÉE
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Formule Premium</h3>
                  <div className="mb-6">
                    <div className="text-4xl font-black text-green-600">1,680€/an</div>
                    <p className="text-sm text-gray-600">au lieu de 2,400€</p>
                  </div>
                  <ul className="space-y-3 text-sm mb-6">
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Tout Essentielle +</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Garantie conducteur renforcée</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Vol + Incendie + Dommages tous accidents</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Assistance 0 km + moto remplacement</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="text-green-600 mr-2 flex-shrink-0 mt-1" />
                      <span>Protection juridique offerte</span>
                    </li>
                  </ul>
                  <a
                    href="#devis"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-center transition-colors"
                  >
                    Devis Premium
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparatif Moto vs Auto */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Moto-Taxi vs Taxi Auto : Comparatif Assurance
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full bg-white shadow-xl rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                    <tr>
                      <th className="p-4 text-left font-bold">Critère</th>
                      <th className="p-4 text-center font-bold">🏍️ MOTO-TAXI</th>
                      <th className="p-4 text-center font-bold">🚕 TAXI AUTO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Prix moyen/an</td>
                      <td className="p-4 text-center text-green-600 font-bold">1,500-2,200€</td>
                      <td className="p-4 text-center text-red-600 font-bold">2,200-3,500€</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Risque accidents</td>
                      <td className="p-4 text-center">Plus élevé (2 roues)</td>
                      <td className="p-4 text-center">Moyen (4 roues)</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Rapidité trajets</td>
                      <td className="p-4 text-center text-green-600 font-bold">2x plus rapide</td>
                      <td className="p-4 text-center">Standard</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Zones autorisées</td>
                      <td className="p-4 text-center">Grandes villes uniquement</td>
                      <td className="p-4 text-center">Partout en France</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Investissement départ</td>
                      <td className="p-4 text-center text-green-600 font-bold">10,000-20,000€</td>
                      <td className="p-4 text-center">20,000-40,000€</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-4 font-semibold">Garantie conducteur</td>
                      <td className="p-4 text-center">Fortement recommandée</td>
                      <td className="p-4 text-center">Recommandée</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
                Questions Fréquentes Moto-Taxi
              </h2>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Comment devenir moto-taxi ?</h3>
                  <p className="text-gray-700">
                    Pour devenir moto-taxi : 1) Permis moto A ou A2 depuis +2 ans, 2) Examen capacité transport personnes (CCPCT),
                    3) Certificat médical, 4) Demande licence moto-taxi en préfecture, 5) <strong>Assurance moto-taxi professionnelle obligatoire</strong>.
                    Délai obtention licence : 2-4 mois.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Quelle moto pour moto-taxi ?</h3>
                  <p className="text-gray-700">
                    Motos recommandées : BMW R1250 RT, Honda Gold Wing, Yamaha FJR 1300, scooters Yamaha T-Max, BMW C 650 GT.
                    <strong>Critères :</strong> 125cc minimum, siège passager confortable avec dossier, top case, puissance suffisante.
                    Attention : <strong>assurance varie selon cylindrée</strong> (125cc moins cher que 1000cc+).
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Assurance moto-taxi électrique ?</h3>
                  <p className="text-gray-700">
                    Oui, TaxiAssur assure les motos électriques moto-taxi (Zero SR, Energica Ego, BMW CE 04).
                    <strong>Réduction de 10%</strong> sur la prime car moins de pannes, entretien réduit.
                    Exemple : Paris moto électrique = 1,386€/an au lieu de 1,540€.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Combien gagne un moto-taxi ?</h3>
                  <p className="text-gray-700">
                    Revenu moyen moto-taxi : <strong>2,500-4,000€/mois</strong> selon ville et activité. Paris : 3,500-5,000€/mois.
                    Charges principales : assurance (1,300-2,200€/an), essence/électricité (200-400€/mois), entretien (100-200€/mois).
                    <strong>Rentabilité meilleure que taxi auto</strong> grâce à investissement départ plus faible.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-3">Moto-taxi sans licence : possible ?</h3>
                  <p className="text-gray-700">
                    <strong>NON, absolument interdit !</strong> Exercer moto-taxi sans licence =
                    <strong> 15,000€ d'amende + 1 an de prison + saisie moto</strong>. De plus, votre assurance ne vous couvrira pas
                    en cas d'accident. <strong>La licence est obligatoire et l'assurance vérifie sa validité</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="devis" className="py-16 bg-gradient-to-br from-orange-900 via-orange-800 to-red-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black mb-4">
                  Obtenez Votre Devis Moto-Taxi en 2 Minutes
                </h2>
                <p className="text-xl text-orange-100">
                  RC Pro + Garanties Passagers + Assistance 0 km
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <EnhancedLeadForm />
                </div>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Bike className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Spécialiste 2 Roues Pro</h3>
                      <p className="text-orange-100">Expertise moto-taxi, scooter, livraison</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Shield className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Couverture Complète</h3>
                      <p className="text-orange-100">RC Pro illimitée + protection passagers</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Zap className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Souscription Express</h3>
                      <p className="text-orange-100">Attestation en 10 min • Roulez aujourd'hui</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-yellow-400 rounded-full p-3 mr-4">
                      <Phone className="text-orange-900" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Assistance Moto 24/7</h3>
                      <p className="text-orange-100">Dépannage 0 km + moto remplacement</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Links */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h3 className="text-xl font-bold mb-6 text-center">Autres assurances transport</h3>
              <div className="grid md:grid-cols-4 gap-4 text-center text-sm">
                <Link to="/assurance-taxi" className="text-yellow-600 hover:underline">Assurance Taxi</Link>
                <Link to="/assurance-taxi-vtc" className="text-yellow-600 hover:underline">Assurance VTC</Link>
                <Link to="/rc-professionnelle" className="text-yellow-600 hover:underline">RC Pro Transport</Link>
                <Link to="/prix-assurance-taxi" className="text-yellow-600 hover:underline">Tarifs Comparés</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default AssuranceMotoTaxi;
